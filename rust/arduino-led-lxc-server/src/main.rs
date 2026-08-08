use arduino_led_core::{
    request_json_blocking, DirectApiTarget, DEFAULT_CONNECT_TIMEOUT, DEFAULT_RESPONSE_TIMEOUT,
};
use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        OriginalUri, Path, State,
    },
    http::{HeaderMap, Method, StatusCode},
    response::Response,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env, fs,
    io::{ErrorKind, Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tokio::task;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

#[derive(Clone)]
struct AppState {
    target: Arc<DirectApiTarget>,
    firmware_catalog: Option<PathBuf>,
    ota_password: Arc<String>,
    ota_port: u16,
    ota_control_token: Arc<String>,
    ota_busy: Arc<AtomicBool>,
    ota_cancel: Arc<AtomicBool>,
    ota_runtime: Arc<Mutex<OtaRuntimeStatus>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtaRuntimeStatus {
    state: String,
    phase: String,
    message: String,
    progress: u8,
    busy: bool,
    expected_version: Option<String>,
    installed_version: Option<String>,
    last_error: Option<String>,
}

impl Default for OtaRuntimeStatus {
    fn default() -> Self {
        Self {
            state: "idle".into(),
            phase: "Készenlét".into(),
            message: "A natív Rust OTA-motor készen áll.".into(),
            progress: 0,
            busy: false,
            expected_version: None,
            installed_version: None,
            last_error: None,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FirmwareInstallRequest {
    #[serde(default)]
    version: Option<String>,
}

fn normalize_ota_version(value: &str) -> String {
    value.trim().trim_start_matches('v').to_ascii_lowercase()
}

fn api_error_text(error: ApiError) -> String {
    let (status, Json(value)) = error;
    format!("HTTP {}: {}", status.as_u16(), value)
}

fn ota_update(state: &AppState, phase: &str, message: impl Into<String>, progress: u8) {
    if let Ok(mut runtime) = state.ota_runtime.lock() {
        runtime.state = "running".into();
        runtime.phase = phase.into();
        runtime.message = message.into();
        runtime.progress = progress.min(100);
        runtime.busy = true;
    }
}

fn ota_authorized(headers: &HeaderMap, state: &AppState) -> bool {
    let expected = state.ota_control_token.trim();
    !expected.is_empty()
        && expected != "CHANGE_ME"
        && headers
            .get("x-lxc-ota-token")
            .and_then(|value| value.to_str().ok())
            .map(|value| value == expected)
            .unwrap_or(false)
}

fn basic64(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut i = 0usize;
    while i < input.len() {
        let a = input[i];
        let b = if i + 1 < input.len() { input[i + 1] } else { 0 };
        let c = if i + 2 < input.len() { input[i + 2] } else { 0 };
        out.push(TABLE[(a >> 2) as usize] as char);
        out.push(TABLE[(((a & 0x03) << 4) | (b >> 4)) as usize] as char);
        if i + 1 < input.len() {
            out.push(TABLE[(((b & 0x0f) << 2) | (c >> 6)) as usize] as char)
        } else {
            out.push('=')
        }
        if i + 2 < input.len() {
            out.push(TABLE[(c & 0x3f) as usize] as char)
        } else {
            out.push('=')
        }
        i += 3;
    }
    out
}

fn parse_ota_response(response: &[u8]) -> Result<(u16, String), String> {
    let split = response
        .windows(4)
        .position(|p| p == b"\r\n\r\n")
        .ok_or_else(|| "Az OTA HTTP fejléc vége hiányzik.".to_string())?;
    let headers = String::from_utf8_lossy(&response[..split]);
    let status = headers
        .lines()
        .next()
        .unwrap_or_default()
        .split_whitespace()
        .nth(1)
        .and_then(|v| v.parse::<u16>().ok())
        .ok_or_else(|| "Érvénytelen OTA HTTP státusz.".to_string())?;
    Ok((
        status,
        String::from_utf8_lossy(&response[split + 4..])
            .trim()
            .to_string(),
    ))
}

fn upload_native(
    address: &str,
    port: u16,
    password: &str,
    firmware: &[u8],
) -> Result<String, String> {
    if firmware.len() < 1024 {
        return Err("A firmware túl kicsi vagy sérült.".into());
    }
    let mut stream = None;
    let mut last = String::new();
    for socket in (address, port)
        .to_socket_addrs()
        .map_err(|e| format!("OTA DNS/IP hiba: {e}"))?
    {
        match TcpStream::connect_timeout(&socket, Duration::from_secs(6)) {
            Ok(s) => {
                stream = Some(s);
                break;
            }
            Err(e) => last = format!("{socket}: {e}"),
        }
    }
    let mut stream =
        stream.ok_or_else(|| format!("OTA kapcsolat sikertelen {address}:{port}. {last}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(120)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(120)))
        .map_err(|e| e.to_string())?;
    stream.set_nodelay(true).ok();

    let credentials = basic64(format!("arduino:{password}").as_bytes());
    let header=format!(
        "POST /sketch HTTP/1.1\r\nHost: {address}:{port}\r\nUser-Agent: Arduino-LED-Controller-LXC/5\r\nAuthorization: Basic {credentials}\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        firmware.len()
    );
    stream
        .write_all(header.as_bytes())
        .map_err(|e| format!("OTA fejléc küldési hiba: {e}"))?;
    for chunk in firmware.chunks(4096) {
        stream
            .write_all(chunk)
            .map_err(|e| format!("Firmware küldési hiba: {e}"))?;
    }
    stream.flush().map_err(|e| format!("OTA flush hiba: {e}"))?;

    let mut response = Vec::new();
    let mut buffer = [0u8; 512];
    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => {
                response.extend_from_slice(&buffer[..n]);
                if response.len() > 8192 {
                    return Err("OTA válasz túl nagy.".into());
                }
            }
            Err(e) if e.kind() == ErrorKind::Interrupted => continue,
            Err(e)
                if matches!(
                    e.kind(),
                    ErrorKind::TimedOut
                        | ErrorKind::WouldBlock
                        | ErrorKind::ConnectionReset
                        | ErrorKind::ConnectionAborted
                        | ErrorKind::UnexpectedEof
                ) =>
            {
                if response.is_empty() {
                    return Err(format!("Arduino nem küldött OTA választ: {e}"));
                }
                break;
            }
            Err(e) => return Err(format!("OTA válasz olvasási hiba: {e}")),
        }
    }
    let (status, body) = parse_ota_response(&response)?;
    if status != 200 {
        return Err(format!("Arduino OTA elutasítás: HTTP {status} {body}"));
    }
    Ok(body)
}

fn firmware_version_from_asset(name: &str) -> Option<String> {
    const PREFIX: &str = "Arduino_LED_Controller_Firmware_";
    const SUFFIX: &str = "_UNO_R4_WiFi.bin";
    name.strip_prefix(PREFIX)
        .and_then(|v| v.strip_suffix(SUFFIX))
        .map(str::to_string)
}

fn github_firmware_artifacts(channel: &str) -> Result<Vec<Value>, String> {
    let output = Command::new("curl")
        .args([
            "-fsSL",
            "--retry",
            "3",
            "--connect-timeout",
            "20",
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            "User-Agent: arduino-led-controller-lxc",
            "https://api.github.com/repos/LexyGuru/arduino-led-controller/releases?per_page=100",
        ])
        .output()
        .map_err(|e| format!("GitHub firmware catalog curl hiba: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "GitHub firmware catalog HTTP hiba: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let releases: Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("GitHub releases JSON hiba: {e}"))?;
    let list = releases
        .as_array()
        .ok_or_else(|| "A GitHub releases válasz nem lista.".to_string())?;
    let want_beta = channel != "stable";
    let mut artifacts = Vec::new();
    for release in list {
        if release
            .get("draft")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            continue;
        }
        let prerelease = release
            .get("prerelease")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        if want_beta != prerelease {
            continue;
        }
        let assets = release
            .get("assets")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        for asset in &assets {
            let Some(name) = asset.get("name").and_then(Value::as_str) else {
                continue;
            };
            let Some(version) = firmware_version_from_asset(name) else {
                continue;
            };
            let checksum_name = format!("{name}.sha256");
            let checksum_url = assets
                .iter()
                .find(|a| a.get("name").and_then(Value::as_str) == Some(checksum_name.as_str()))
                .and_then(|a| a.get("browser_download_url"))
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let download_url = asset
                .get("browser_download_url")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            if download_url.is_empty() || checksum_url.is_empty() {
                continue;
            }
            artifacts.push(json!({"name":name,"downloadUrl":download_url,"checksumUrl":checksum_url,"firmwareVersion":version,"version":version,"tag":release.get("tag_name").and_then(Value::as_str).unwrap_or(&version),"createdAt":release.get("published_at").and_then(Value::as_str),"summary":release.get("name").and_then(Value::as_str).unwrap_or("Arduino LED Controller firmware"),"channel":if prerelease{"beta"}else{"stable"},"otaPort":65280,"installMode":"native-rust-http"}));
        }
    }
    artifacts.sort_by(|a, b| {
        b.get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or("")
            .cmp(a.get("createdAt").and_then(Value::as_str).unwrap_or(""))
    });
    Ok(artifacts)
}

async fn firmware_releases(OriginalUri(uri): OriginalUri) -> ApiResult {
    let channel = uri
        .query()
        .and_then(|q| {
            q.split('&').find_map(|p| {
                let mut x = p.splitn(2, '=');
                match (x.next(), x.next()) {
                    (Some("channel"), Some(v)) => Some(v.to_string()),
                    _ => None,
                }
            })
        })
        .unwrap_or_else(|| "beta".into());
    let c = channel.clone();
    let result = task::spawn_blocking(move || github_firmware_artifacts(&c))
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error":format!("firmware worker error: {e}")})),
            )
        })?
        .map_err(|e| (StatusCode::BAD_GATEWAY, Json(json!({"error":e}))))?;
    Ok(Json(
        json!({"source":"github-releases","channel":channel,"artifacts":result}),
    ))
}

async fn firmware_cancel(State(state): State<AppState>, headers: HeaderMap) -> ApiResult {
    if !ota_authorized(&headers, &state) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"Érvénytelen vagy hiányzó LXC OTA control token."})),
        ));
    }
    state.ota_cancel.store(true, Ordering::SeqCst);
    Ok(Json(
        json!({"cancelRequested":true,"message":"OTA megszakítás kérve."}),
    ))
}

fn catalog_artifact(
    state: &AppState,
    requested: Option<&str>,
) -> Result<(String, String, String, u16), String> {
    let path = state
        .firmware_catalog
        .as_ref()
        .ok_or("Firmware katalógus nincs konfigurálva.")?;
    let value: Value = serde_json::from_slice(
        &fs::read(path).map_err(|e| format!("Katalógus olvasási hiba: {e}"))?,
    )
    .map_err(|e| format!("Katalógus JSON hiba: {e}"))?;
    let artifacts = value
        .get("artifacts")
        .and_then(Value::as_array)
        .ok_or("Nincs artifacts lista.")?;
    let local = artifacts.iter().find(|a| {
        requested
            .map(|wanted| {
                a.get("version")
                    .and_then(Value::as_str)
                    .map(normalize_ota_version)
                    == Some(normalize_ota_version(wanted))
            })
            .unwrap_or(true)
    });
    let remote;
    let a = if let Some(local) = local {
        local
    } else {
        remote = github_firmware_artifacts("beta")?
            .into_iter()
            .chain(github_firmware_artifacts("stable")?)
            .find(|a| {
                requested
                    .map(|wanted| {
                        a.get("firmwareVersion")
                            .or_else(|| a.get("version"))
                            .and_then(Value::as_str)
                            .map(normalize_ota_version)
                            == Some(normalize_ota_version(wanted))
                    })
                    .unwrap_or(false)
            })
            .ok_or_else(|| {
                "A kért firmware nem található a GitHub release-katalógusban.".to_string()
            })?;
        &remote
    };
    Ok((
        a.get("firmwareVersion")
            .or_else(|| a.get("version"))
            .and_then(Value::as_str)
            .ok_or("version hiányzik")?
            .to_string(),
        a.get("downloadUrl")
            .and_then(Value::as_str)
            .ok_or("downloadUrl hiányzik")?
            .to_string(),
        a.get("checksumUrl")
            .and_then(Value::as_str)
            .ok_or("checksumUrl hiányzik")?
            .to_string(),
        a.get("otaPort")
            .and_then(Value::as_u64)
            .and_then(|v| u16::try_from(v).ok())
            .unwrap_or(state.ota_port),
    ))
}

fn download_and_verify(url: &str, checksum_url: &str) -> Result<Vec<u8>, String> {
    let dir = PathBuf::from("/var/lib/arduino-led-controller");
    let bin = dir.join("ota-firmware.bin.tmp");
    let sha = dir.join("ota-firmware.bin.sha256.tmp");
    let status = Command::new("curl")
        .args(["-fL", "--retry", "3", "--connect-timeout", "20", "-o"])
        .arg(&bin)
        .arg(url)
        .status()
        .map_err(|e| format!("curl indítási hiba: {e}"))?;
    if !status.success() {
        return Err(format!("Firmware letöltés sikertelen: {status}"));
    }
    let status = Command::new("curl")
        .args(["-fL", "--retry", "3", "--connect-timeout", "20", "-o"])
        .arg(&sha)
        .arg(checksum_url)
        .status()
        .map_err(|e| format!("checksum curl hiba: {e}"))?;
    if !status.success() {
        return Err(format!("Checksum letöltés sikertelen: {status}"));
    }
    let expected = fs::read_to_string(&sha)
        .map_err(|e| e.to_string())?
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    let output = Command::new("sha256sum")
        .arg(&bin)
        .output()
        .map_err(|e| format!("sha256sum hiba: {e}"))?;
    if !output.status.success() {
        return Err("sha256sum sikertelen.".into());
    }
    let actual = String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    if expected.len() != 64 || expected != actual {
        return Err(format!("SHA-256 eltérés. Várt {expected}, kapott {actual}"));
    }
    let bytes = fs::read(&bin).map_err(|e| format!("Firmware visszaolvasási hiba: {e}"))?;
    let _ = fs::remove_file(bin);
    let _ = fs::remove_file(sha);
    Ok(bytes)
}

async fn ota_runtime_status(State(state): State<AppState>) -> Json<Value> {
    let runtime = state
        .ota_runtime
        .lock()
        .map(|v| v.clone())
        .unwrap_or_default();
    Json(json!({
        "runtime":runtime,
        "configured":!state.ota_password.trim().is_empty()&&state.ota_password.as_str()!="CHANGE_ME",
        "controlTokenConfigured":!state.ota_control_token.trim().is_empty()&&state.ota_control_token.as_str()!="CHANGE_ME",
        "engine":"native-rust-http",
        "supportedPlatforms":["windows","macos","linux","proxmox-lxc"],
        "mobileSupported":false
    }))
}

async fn firmware_install_job(
    state: AppState,
    request: FirmwareInstallRequest,
) -> Result<(), String> {
    state.ota_cancel.store(false, Ordering::SeqCst);
    let (version, url, checksum_url, catalog_port) =
        catalog_artifact(&state, request.version.as_deref())?;
    if let Ok(mut r) = state.ota_runtime.lock() {
        r.expected_version = Some(version.clone());
        r.installed_version = None;
        r.last_error = None
    }
    ota_update(
        &state,
        "Letöltés",
        format!("Firmware + SHA letöltése: {version}"),
        10,
    );
    let firmware = task::spawn_blocking(move || download_and_verify(&url, &checksum_url))
        .await
        .map_err(|e| e.to_string())??;
    if state.ota_cancel.load(Ordering::SeqCst) {
        return Err("OTA megszakítva a letöltés után.".into());
    }

    ota_update(
        &state,
        "Arduino",
        "OTA-cél és persistence állapot ellenőrzése…",
        30,
    );
    let before = direct_request(state.clone(), Method::GET, "/api/v1/status".into(), None)
        .await
        .map(|Json(v)| v)
        .map_err(api_error_text)?;
    let address = before
        .get("ipAddress")
        .and_then(Value::as_str)
        .filter(|v| !v.trim().is_empty())
        .unwrap_or(state.target.host.as_str())
        .to_string();
    let port = before
        .get("otaPort")
        .and_then(Value::as_u64)
        .and_then(|v| u16::try_from(v).ok())
        .unwrap_or(catalog_port);
    let boot_before = before
        .get("bootId")
        .and_then(Value::as_str)
        .map(str::to_string);
    let rev_before = before.get("scheduleRevision").and_then(Value::as_u64);
    let sum_before = before
        .get("scheduleChecksum")
        .and_then(Value::as_str)
        .map(str::to_string);

    ota_update(
        &state,
        "Prepare",
        format!("OTA listener: {address}:{port}"),
        40,
    );
    let _ = direct_request(
        state.clone(),
        Method::POST,
        "/api/v1/ota/prepare".into(),
        None,
    )
    .await
    .map_err(api_error_text)?;
    tokio::time::sleep(Duration::from_millis(1200)).await;

    ota_update(
        &state,
        "Feltöltés",
        "Natív Rust POST /sketch feltöltés…",
        50,
    );
    let pass = state.ota_password.as_ref().clone();
    let addr = address.clone();
    if state.ota_cancel.load(Ordering::SeqCst) {
        return Err("OTA megszakítva feltöltés előtt.".into());
    }
    task::spawn_blocking(move || upload_native(&addr, port, &pass, &firmware))
        .await
        .map_err(|e| e.to_string())??;

    ota_update(
        &state,
        "Újraindítás",
        "Arduino visszatérésének és firmware-verziójának ellenőrzése…",
        90,
    );
    let started = Instant::now();
    let mut after = None;
    let mut installed = None;
    while started.elapsed() < Duration::from_secs(180) {
        if state.ota_cancel.load(Ordering::SeqCst) {
            return Err("OTA ellenőrzés megszakítva.".into());
        }
        tokio::time::sleep(Duration::from_secs(3)).await;
        if let Ok(Json(status)) =
            direct_request(state.clone(), Method::GET, "/api/v1/status".into(), None).await
        {
            let current = status
                .get("firmwareVersion")
                .and_then(Value::as_str)
                .map(str::to_string);
            if current.as_deref().map(normalize_ota_version)
                == Some(normalize_ota_version(&version))
            {
                installed = current;
                after = Some(status);
                break;
            }
        }
    }
    let after =
        after.ok_or_else(|| format!("Az Arduino nem igazolta 180 mp-en belül: {version}"))?;
    let boot_after = after
        .get("bootId")
        .and_then(Value::as_str)
        .map(str::to_string);
    let rev_after = after.get("scheduleRevision").and_then(Value::as_u64);
    let sum_after = after
        .get("scheduleChecksum")
        .and_then(Value::as_str)
        .map(str::to_string);
    if boot_before.is_some() && boot_before == boot_after {
        return Err("Boot ID nem változott OTA után.".into());
    }
    if rev_before != rev_after || sum_before != sum_after {
        return Err(format!(
            "Schedule persistence eltérés: revision {:?}->{:?}, checksum {:?}->{:?}",
            rev_before, rev_after, sum_before, sum_after
        ));
    }

    if let Ok(mut r) = state.ota_runtime.lock() {
        r.state = "success".into();
        r.phase = "Kész".into();
        r.message = format!("Firmware sikeresen telepítve: {version}");
        r.progress = 100;
        r.busy = false;
        r.installed_version = installed;
        r.last_error = None
    }
    Ok(())
}

async fn firmware_install_start(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<FirmwareInstallRequest>,
) -> ApiResult {
    if !ota_authorized(&headers, &state) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"Érvénytelen vagy hiányzó LXC OTA control token."})),
        ));
    }
    if state.ota_password.trim().is_empty() || state.ota_password.as_str() == "CHANGE_ME" {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({"error":"ARDUINO_OTA_PASSWORD nincs konfigurálva."})),
        ));
    }
    if state
        .ota_busy
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({"error":"Már fut OTA-frissítés."})),
        ));
    }
    let job = state.clone();
    tokio::spawn(async move {
        if let Err(error) = firmware_install_job(job.clone(), request).await {
            if let Ok(mut r) = job.ota_runtime.lock() {
                r.state = "error".into();
                r.phase = "Hiba".into();
                r.message = error.clone();
                r.busy = false;
                r.last_error = Some(error)
            }
        }
        job.ota_busy.store(false, Ordering::SeqCst);
    });
    Ok(Json(
        json!({"accepted":true,"engine":"native-rust-http","message":"OTA háttérfeladat elindítva."}),
    ))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Health {
    status: &'static str,
    service: &'static str,
    phase: &'static str,
}

type ApiError = (StatusCode, Json<Value>);
type ApiResult = Result<Json<Value>, ApiError>;

fn required(name: &str) -> Result<String, String> {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("missing environment variable: {name}"))
}

fn env_u16(name: &str, default: u16) -> Result<u16, String> {
    match env::var(name) {
        Ok(value) => value
            .parse::<u16>()
            .map_err(|_| format!("invalid {name}: {value}")),
        Err(_) => Ok(default),
    }
}

fn load_target() -> Result<DirectApiTarget, String> {
    let target = DirectApiTarget {
        protocol: env::var("ARDUINO_PROTOCOL").unwrap_or_else(|_| "http".into()),
        host: required("ARDUINO_HOST")?,
        port: env_u16("ARDUINO_PORT", 80)?,
        api_path: env::var("ARDUINO_API_PATH").unwrap_or_else(|_| "/api/v1".into()),
        device_key: required("ARDUINO_DEVICE_KEY")?,
    };
    target.validate().map_err(|error| error.to_string())?;
    Ok(target)
}

fn json_body(bytes: Bytes) -> Result<Option<Value>, ApiError> {
    if bytes.is_empty() {
        return Ok(None);
    }
    serde_json::from_slice(&bytes).map(Some).map_err(|error| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": format!("invalid JSON body: {error}")})),
        )
    })
}

async fn direct_request(
    state: AppState,
    method: Method,
    path_and_query: String,
    body: Option<Value>,
) -> ApiResult {
    let target = Arc::clone(&state.target);
    let method = method.to_string();

    let result = task::spawn_blocking(move || {
        request_json_blocking(
            &target,
            &method,
            &path_and_query,
            body.as_ref(),
            DEFAULT_CONNECT_TIMEOUT,
            DEFAULT_RESPONSE_TIMEOUT,
        )
    })
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("worker error: {error}")})),
        )
    })?;

    result.map(Json).map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error": error.to_string()})),
        )
    })
}

async fn live() -> Json<Health> {
    Json(Health {
        status: "ok",
        service: "arduino-led-lxc-server",
        phase: "shared-core-phase2",
    })
}

async fn ready(State(state): State<AppState>) -> ApiResult {
    direct_request(state, Method::GET, "/api/v1/status".into(), None).await
}

async fn proxy_get(State(state): State<AppState>, OriginalUri(uri): OriginalUri) -> ApiResult {
    let path = uri
        .path_and_query()
        .map(|value| value.as_str().to_string())
        .unwrap_or_else(|| uri.path().to_string());
    direct_request(state, Method::GET, path, None).await
}

async fn proxy_delete(State(state): State<AppState>, OriginalUri(uri): OriginalUri) -> ApiResult {
    let path = uri
        .path_and_query()
        .map(|value| value.as_str().to_string())
        .unwrap_or_else(|| uri.path().to_string());
    direct_request(state, Method::DELETE, path, None).await
}

async fn proxy_put(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    body: Bytes,
) -> ApiResult {
    let payload = json_body(body)?;
    let path = uri
        .path_and_query()
        .map(|value| value.as_str().to_string())
        .unwrap_or_else(|| uri.path().to_string());
    direct_request(state, Method::PUT, path, payload).await
}

async fn proxy_post(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    body: Bytes,
) -> ApiResult {
    let payload = json_body(body)?;
    let path = uri
        .path_and_query()
        .map(|value| value.as_str().to_string())
        .unwrap_or_else(|| uri.path().to_string());
    direct_request(state, Method::POST, path, payload).await
}

async fn firmware_catalog(State(state): State<AppState>) -> ApiResult {
    let Some(path) = state.firmware_catalog.as_ref() else {
        return Ok(Json(json!({
            "channel": "beta",
            "source": "not-configured",
            "artifacts": []
        })));
    };

    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Json(json!({
                "schemaVersion": 1,
                "channel": "beta",
                "source": "catalog-file-missing",
                "available": false,
                "path": path.display().to_string(),
                "artifacts": []
            })));
        }
        Err(error) => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"error": format!("firmware catalog read failed: {error}")})),
            ));
        }
    };
    let value: Value = serde_json::from_slice(&bytes).map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("firmware catalog JSON invalid: {error}")})),
        )
    })?;
    Ok(Json(value))
}

async fn server_info(State(state): State<AppState>) -> Json<Value> {
    fn read_trim(path: &str) -> Option<String> {
        fs::read_to_string(path)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }

    let catalog_path = state
        .firmware_catalog
        .as_ref()
        .map(|value| value.display().to_string());
    let catalog_available = state
        .firmware_catalog
        .as_ref()
        .map(|value| value.is_file())
        .unwrap_or(false);
    let web_root =
        env::var("WEB_ROOT").unwrap_or_else(|_| "/opt/arduino-led-controller/current/web".into());

    Json(json!({
        "service": "arduino-led-lxc-server",
        "platform": "Debian 13 / Rust Axum",
        "configPath": "/etc/arduino-led-controller/lxc.env",
        "updateConfigPath": "/etc/arduino-led-controller/update.env",
        "installedVersion": read_trim("/var/lib/arduino-led-controller/installed-version"),
        "installedCommit": read_trim("/var/lib/arduino-led-controller/installed-commit"),
        "channel": read_trim("/etc/arduino-led-channel"),
        "branch": read_trim("/etc/arduino-led-branch"),
        "firmwareCatalogPath": catalog_path,
        "firmwareCatalogAvailable": catalog_available,
        "webRoot": web_root,
        "otaEngine": "native-rust-http",
        "otaSupported": true,
        "otaPasswordConfigured": !state.ota_password.trim().is_empty() && state.ota_password.as_str() != "CHANGE_ME",
        "otaControlTokenConfigured": !state.ota_control_token.trim().is_empty() && state.ota_control_token.as_str() != "CHANGE_ME"
    }))
}

async fn ws_events(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket| event_socket(socket, state))
}

async fn event_socket(mut socket: WebSocket, state: AppState) {
    let mut interval = tokio::time::interval(Duration::from_secs(2));
    let mut after_id: u64 = 0;

    loop {
        interval.tick().await;

        let status = direct_request(state.clone(), Method::GET, "/api/v1/status".into(), None)
            .await
            .map(|Json(value)| value)
            .unwrap_or_else(|(_, Json(error))| json!({"error": error}));

        let logs_path = format!("/api/v1/logs?afterId={after_id}");
        let logs = direct_request(state.clone(), Method::GET, logs_path, None)
            .await
            .map(|Json(value)| value)
            .unwrap_or_else(|(_, Json(error))| json!({"error": error}));

        if let Some(last_id) = logs.get("lastId").and_then(Value::as_u64) {
            after_id = last_id;
        }

        let event = json!({
            "type": "snapshot",
            "status": status,
            "logs": logs
        });

        if socket
            .send(Message::Text(event.to_string().into()))
            .await
            .is_err()
        {
            break;
        }
    }
}

async fn transaction_chunks(
    State(state): State<AppState>,
    Path(tx): Path<String>,
    body: Bytes,
) -> ApiResult {
    let payload = json_body(body)?;
    direct_request(
        state,
        Method::PUT,
        format!("/api/v1/schedules/transactions/{tx}/chunks"),
        payload,
    )
    .await
}

async fn transaction_commit(
    State(state): State<AppState>,
    Path(tx): Path<String>,
    body: Bytes,
) -> ApiResult {
    let payload = json_body(body)?;
    direct_request(
        state,
        Method::POST,
        format!("/api/v1/schedules/transactions/{tx}/commit"),
        payload,
    )
    .await
}

async fn transaction_abort(State(state): State<AppState>, Path(tx): Path<String>) -> ApiResult {
    direct_request(
        state,
        Method::DELETE,
        format!("/api/v1/schedules/transactions/{tx}"),
        None,
    )
    .await
}

#[tokio::main]
async fn main() -> Result<(), String> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "arduino_led_lxc_server=info,tower_http=info".into()),
        )
        .init();

    let bind_host = env::var("LXC_BIND_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let bind_port = env_u16("LXC_BIND_PORT", 3000)?;
    let address: SocketAddr = format!("{bind_host}:{bind_port}")
        .parse()
        .map_err(|error| format!("invalid bind address: {error}"))?;

    let state = AppState {
        target: Arc::new(load_target()?),
        firmware_catalog: env::var("FIRMWARE_CATALOG_JSON")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .map(PathBuf::from),
        ota_password: Arc::new(env::var("ARDUINO_OTA_PASSWORD").unwrap_or_default()),
        ota_port: env_u16("ARDUINO_OTA_PORT", 65280)?,
        ota_control_token: Arc::new(env::var("LXC_OTA_CONTROL_TOKEN").unwrap_or_default()),
        ota_busy: Arc::new(AtomicBool::new(false)),
        ota_cancel: Arc::new(AtomicBool::new(false)),
        ota_runtime: Arc::new(Mutex::new(OtaRuntimeStatus::default())),
    };

    let web_root =
        env::var("WEB_ROOT").unwrap_or_else(|_| "/opt/arduino-led-controller/current/web".into());
    let web_index = PathBuf::from(&web_root).join("index.html");
    let web_service = ServeDir::new(&web_root).not_found_service(ServeFile::new(web_index));

    let app = Router::new()
        .route("/health/live", get(live))
        .route("/health/ready", get(ready))
        .route("/api/v1/status", get(proxy_get))
        .route("/api/v1/logs", get(proxy_get))
        .route("/api/v1/logs/clear", post(proxy_post))
        .route("/api/v1/time/config", put(proxy_put))
        .route("/api/v1/leds/{id}", put(proxy_put))
        .route("/api/v1/leds/all", post(proxy_post))
        .route("/api/v1/schedules/status", get(proxy_get))
        .route("/api/v1/schedules", get(proxy_get).delete(proxy_delete))
        .route("/api/v1/schedules/transactions", post(proxy_post))
        .route(
            "/api/v1/schedules/transactions/{tx}/chunks",
            put(transaction_chunks),
        )
        .route(
            "/api/v1/schedules/transactions/{tx}/commit",
            post(transaction_commit),
        )
        .route(
            "/api/v1/schedules/transactions/{tx}",
            delete(transaction_abort),
        )
        .route("/api/v1/ota/status", get(proxy_get))
        .route("/api/v1/ota/prepare", post(proxy_post))
        .route("/api/v1/server/firmware/catalog", get(firmware_catalog))
        .route("/api/v1/server/firmware/releases", get(firmware_releases))
        .route("/api/v1/server/ota/runtime", get(ota_runtime_status))
        .route("/api/v1/server/firmware/cancel", post(firmware_cancel))
        .route(
            "/api/v1/server/firmware/install",
            post(firmware_install_start),
        )
        .route("/api/v1/server/info", get(server_info))
        .route("/api/v1/events/ws", get(ws_events))
        .fallback_service(web_service)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(address)
        .await
        .map_err(|error| format!("bind failed: {error}"))?;

    tracing::info!("arduino-led-lxc-server phase2 listening on {address}");

    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .map_err(|error| error.to_string())
}
