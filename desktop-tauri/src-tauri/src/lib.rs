use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    fs,
    env,
    io::{ErrorKind, Read, Write},
    net::{Ipv4Addr, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Config {
    // Távoli/DDNS HTTP elérés. Helyi hálózaton nem ezt használjuk elsőként.
    arduino_ip: String,
    arduino_port: u16,
    // Közvetlen LAN-cím. Ez kerüli el a router NAT-loopback/hairpin hibáit.
    local_arduino_ip: String,
    local_arduino_port: u16,
    prefer_local: bool,
    arduino_api_path: String,
    arduino_api_key: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            arduino_ip: "10.0.0.123".into(),
            arduino_port: 80,
            local_arduino_ip: "10.0.0.123".into(),
            local_arduino_port: 80,
            prefer_local: true,
            arduino_api_path: String::new(),
            arduino_api_key: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleLed {
    id: u8,
    enabled: bool,
    brightness: u8,
    effect: u8,
    #[serde(default = "default_schedule_speed")]
    speed: u8,
    color: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Schedule {
    #[serde(default)]
    id: String,
    day: u8,
    time: String,
    leds: Vec<ScheduleLed>,
}


fn default_schedule_speed() -> u8 { 50 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleFile {
    format: String,
    version: u8,
    exported_at: String,
    schedules: Vec<Schedule>,
}

fn normalize_schedules(mut schedules: Vec<Schedule>) -> Result<Vec<Schedule>, String> {
    for (index, schedule) in schedules.iter_mut().enumerate() {
        if schedule.id.trim().is_empty() {
            schedule.id = format!("imported-{}-{}-{}", schedule.day, schedule.time.replace(':', ""), index);
        }
        for led in &mut schedule.leds {
            if led.speed == 0 { led.speed = 50; }
        }
    }
    schedules.sort_by(|a, b| a.day.cmp(&b.day).then(a.time.cmp(&b.time)));
    validate_schedules(&schedules)?;
    Ok(schedules)
}

fn parse_schedules_json(bytes: &[u8]) -> Result<Vec<Schedule>, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|e| format!("Hibás JSON-fájl: {e}"))?;
    let schedules_value = if value.is_array() {
        value
    } else {
        value.get("schedules").cloned().ok_or_else(|| "A JSON nem tartalmaz schedules listát.".to_string())?
    };
    let schedules: Vec<Schedule> = serde_json::from_value(schedules_value)
        .map_err(|e| format!("Hibás időzítés-formátum: {e}"))?;
    normalize_schedules(schedules)
}

fn schedule_file_bytes(schedules: Vec<Schedule>) -> Result<Vec<u8>, String> {
    let schedules = normalize_schedules(schedules)?;
    let exported_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs().to_string();
    let wrapper = ScheduleFile {
        format: "arduino-led-controller-schedules".into(),
        version: 1,
        exported_at,
        schedules,
    };
    serde_json::to_vec_pretty(&wrapper).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkLog {
    timestamp: u64,
    endpoint: String,
    ok: bool,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct FirmwareArtifact {
    name: String,
    download_url: String,
    checksum_url: String,
    firmware_version: Option<String>,
    tag: String,
    created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct FirmwareStatus {
    state: String,
    message: String,
    installed_version: Option<String>,
    arduino_online: bool,
    ota_tool_installed: bool,
    ota_password_configured: bool,
    available_firmware: Option<FirmwareArtifact>,
    firmware_lookup_error: Option<String>,
    ota_tool_path: Option<String>,
    ota_tool_error: Option<String>,
    ota_target_address: Option<String>,
    ota_target_port: Option<u16>,
    update_available: bool,
}

struct AppState {
    config: Mutex<Config>,
    network_logs: Mutex<Vec<NetworkLog>>,
    firmware_status: Mutex<FirmwareStatus>,
    // Az UNO R4 WiFi egyszerű HTTP-szervere nem stabil több egyidejű TCP-kérésnél.
    // Minden Arduino-kérést egyetlen sorba állítunk.
    arduino_request_lock: Arc<Mutex<()>>,
    ota_in_progress: Arc<AtomicBool>,
    // A státuszválaszból megtanult belső IP-cím, csak az aktuális futásra.
    last_known_local_ip: Mutex<Option<String>>,
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let p = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p)
}
fn config_path(app: &AppHandle) -> Result<PathBuf, String> { Ok(app_dir(app)?.join("connection.json")) }
fn schedules_path(app: &AppHandle) -> Result<PathBuf, String> { Ok(app_dir(app)?.join("weekly-led-schedules.json")) }
fn secret_path(app: &AppHandle) -> Result<PathBuf, String> { Ok(app_dir(app)?.join("ota-secret.txt")) }
fn firmware_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let p = app_dir(app)?.join("firmware");
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p)
}

fn validate_host(host: &str, label: &str) -> Result<(), String> {
    if host.is_empty() { return Ok(()); }
    if host.contains("://") || host.contains('/') || host.contains(' ') || host.len() > 253 {
        return Err(format!("A(z) {label} mezőben csak IP-címet vagy DDNS-nevet adj meg, protokoll nélkül."));
    }
    Ok(())
}

fn validate_config(c: &Config) -> Result<(), String> {
    let remote = c.arduino_ip.trim();
    let local = c.local_arduino_ip.trim();
    if remote.is_empty() && local.is_empty() {
        return Err("Legalább a helyi vagy a távoli Arduino-címet add meg.".into());
    }
    validate_host(remote, "távoli Arduino-cím")?;
    validate_host(local, "helyi Arduino-cím")?;
    if !remote.is_empty() && c.arduino_port == 0 { return Err("Érvénytelen távoli HTTP-port.".into()); }
    if !local.is_empty() && c.local_arduino_port == 0 { return Err("Érvénytelen helyi HTTP-port.".into()); }
    Ok(())
}

fn percent_encode(v: &str) -> String {
    v.bytes().map(|b| match b {
        b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
        _ => format!("%{b:02X}"),
    }).collect()
}

fn protected_path(c: &Config, path: &str) -> Result<String, String> {
    let prefix = c.arduino_api_path.trim_end_matches('/');
    if prefix.is_empty() { return Ok(path.to_string()); }
    if prefix.len() < 18 || !prefix.starts_with('/') || c.arduino_api_key.len() < 24 {
        return Err("A védett API-útvonal vagy API-kulcs nincs megfelelően beállítva.".into());
    }
    let sep = if path.contains('?') { '&' } else { '?' };
    Ok(format!("{prefix}{path}{sep}k={}", percent_encode(&c.arduino_api_key)))
}

fn add_log(state: &AppState, endpoint: &str, ok: bool, message: String) {
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    if let Ok(mut logs) = state.network_logs.lock() {
        // Az ismétlődő sikeres polling ne árassza el a hálózati naplót.
        if ok {
            if let Some(last) = logs.last() {
                if last.ok && last.endpoint == endpoint && last.message == message && timestamp.saturating_sub(last.timestamp) < 30 {
                    return;
                }
            }
        }
        logs.push(NetworkLog { timestamp, endpoint: endpoint.into(), ok, message });
        let excess = logs.len().saturating_sub(200);
        if excess > 0 { logs.drain(0..excess); }
    }
}

const HTTP_MAX_RESPONSE_BYTES: usize = 128 * 1024;

fn parse_content_length(headers: &str) -> Option<usize> {
    headers.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.trim().eq_ignore_ascii_case("content-length") {
            value.trim().parse::<usize>().ok()
        } else {
            None
        }
    })
}

fn is_private_or_local_ipv4(value: &str) -> bool {
    value
        .parse::<Ipv4Addr>()
        .map(|ip| ip.is_private() || ip.is_loopback() || ip.is_link_local())
        .unwrap_or(false)
}

#[derive(Debug, Clone)]
struct HttpTarget {
    host: String,
    port: u16,
    label: &'static str,
}

fn push_target(targets: &mut Vec<HttpTarget>, host: &str, port: u16, label: &'static str) {
    let host = host.trim();
    if host.is_empty() || port == 0 { return; }
    if targets.iter().any(|item| item.host.eq_ignore_ascii_case(host) && item.port == port) { return; }
    targets.push(HttpTarget { host: host.to_string(), port, label });
}

fn connection_targets(config: &Config, learned_local_ip: Option<&str>) -> Vec<HttpTarget> {
    let mut local = Vec::new();
    push_target(&mut local, &config.local_arduino_ip, config.local_arduino_port, "helyi");
    if let Some(ip) = learned_local_ip {
        push_target(&mut local, ip, config.local_arduino_port.max(1), "felismert helyi");
    }

    let mut remote = Vec::new();
    push_target(&mut remote, &config.arduino_ip, config.arduino_port, "távoli/DDNS");

    if config.prefer_local {
        local.extend(remote);
        local
    } else {
        remote.extend(local);
        remote
    }
}

fn raw_get_once(c: &Config, path: &str, timeout: Duration) -> Result<Value, String> {
    validate_config(c)?;
    let host = c.arduino_ip.trim();
    let addresses = (host, c.arduino_port)
        .to_socket_addrs()
        .map_err(|e| format!("DNS-feloldási hiba: {e}"))?;

    let mut connected = None;
    let mut last_error = String::new();
    for addr in addresses {
        match TcpStream::connect_timeout(&addr, timeout) {
            Ok(stream) => {
                connected = Some(stream);
                break;
            }
            Err(e) => last_error = format!("{addr}: {e}"),
        }
    }

    let mut stream = connected.ok_or_else(|| {
        format!(
            "Nem sikerült kapcsolódni a(z) {host}:{} címhez. {last_error}",
            c.arduino_port
        )
    })?;
    stream.set_nodelay(true).ok();
    stream.set_read_timeout(Some(timeout)).map_err(|e| e.to_string())?;
    stream.set_write_timeout(Some(timeout)).map_err(|e| e.to_string())?;

    let request_path = protected_path(c, path)?;
    let request = format!(
        "GET {request_path} HTTP/1.1\r\nHost: {host}:{}\r\nUser-Agent: Arduino-LED-Controller-Tauri/3.0.10\r\nAccept: application/json\r\nConnection: close\r\n\r\n",
        c.arduino_port
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("Arduino kérés küldési hiba: {e}"))?;
    stream.flush().map_err(|e| format!("Arduino kérés flush hiba: {e}"))?;

    let mut response = Vec::with_capacity(4096);
    let mut buffer = [0u8; 2048];
    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => {
                response.extend_from_slice(&buffer[..read]);
                if response.len() > HTTP_MAX_RESPONSE_BYTES {
                    return Err(format!("Az Arduino HTTP-válasza túl nagy (>{HTTP_MAX_RESPONSE_BYTES} bájt)."));
                }
            }
            Err(error) if error.kind() == ErrorKind::Interrupted => continue,
            Err(error)
                if error.kind() == ErrorKind::TimedOut
                    || error.kind() == ErrorKind::WouldBlock
                    || error.kind() == ErrorKind::ConnectionReset
                    || error.kind() == ErrorKind::ConnectionAborted
                    || error.kind() == ErrorKind::UnexpectedEof =>
            {
                if response.is_empty() {
                    return Err(format!("Az Arduino nem küldött teljes HTTP-választ: {error}"));
                }
                break;
            }
            Err(error) => return Err(format!("Arduino válaszolvasási hiba: {error}")),
        }
    }

    if response.is_empty() {
        return Err("Az Arduino üres választ adott.".into());
    }

    let split = response
        .windows(4)
        .position(|part| part == b"\r\n\r\n")
        .ok_or_else(|| "Az Arduino csonka HTTP-választ adott: hiányzik a fejléc vége.".to_string())?;
    let headers = String::from_utf8_lossy(&response[..split]);
    let status_line = headers.lines().next().unwrap_or_default();
    let status_code = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| format!("Érvénytelen Arduino HTTP-státusz: {status_line}"))?;
    if status_code != 200 {
        return Err(format!("Arduino HTTP-válasz: {status_line}"));
    }

    let mut body = &response[split + 4..];
    if let Some(expected) = parse_content_length(&headers) {
        if body.len() < expected {
            return Err(format!("Az Arduino csonka HTTP-választ adott: {} / {} bájt érkezett.", body.len(), expected));
        }
        body = &body[..expected];
    }

    let body = body.iter().copied().skip_while(|byte| byte.is_ascii_whitespace()).collect::<Vec<_>>();
    if body.is_empty() {
        return Err("Az Arduino HTTP-válaszának törzse üres volt.".into());
    }

    serde_json::from_slice(&body).map_err(|error| {
        let preview = String::from_utf8_lossy(&body).chars().take(160).collect::<String>();
        format!("Hibás vagy csonka Arduino JSON-válasz: {error}. Részlet: {preview}")
    })
}

async fn get_json(state: &AppState, path: &str) -> Result<Value, String> {
    if state.ota_in_progress.load(Ordering::SeqCst) {
        return Err("OTA-frissítés folyamatban; az automatikus Arduino-lekérések szünetelnek.".into());
    }
    let config = state.config.lock().map_err(|_| "Beállítás zárolva".to_string())?.clone();
    let learned_local = state.last_known_local_ip.lock().ok().and_then(|value| value.clone());
    let targets = connection_targets(&config, learned_local.as_deref());
    if targets.is_empty() { return Err("Nincs használható Arduino-cím beállítva.".into()); }

    let request_path = path.to_string();
    let request_lock = Arc::clone(&state.arduino_request_lock);
    let base_config = config.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let _guard = request_lock.lock().map_err(|_| "Az Arduino kérési sor zárolása megsérült.".to_string())?;
        let mut errors = Vec::new();
        for target in targets {
            let mut target_config = base_config.clone();
            target_config.arduino_ip = target.host.clone();
            target_config.arduino_port = target.port;
            // LAN-on gyorsan hibázzunk; DDNS-en se tartsuk fel hosszú ideig az egész alkalmazást.
            let timeout = if is_private_or_local_ipv4(&target.host) { Duration::from_millis(1200) } else { Duration::from_millis(2200) };
            match raw_get_once(&target_config, &request_path, timeout) {
                Ok(value) => {
                    let endpoint = format!("http://{}:{}{}", target.host, target.port, request_path);
                    return Ok((value, endpoint, target.label));
                }
                Err(error) => errors.push(format!("{} {}:{}: {}", target.label, target.host, target.port, error)),
            }
        }
        Err(format!("Az Arduino egyik beállított címen sem érhető el. {}", errors.join(" | ")))
    }).await;

    match result {
        Ok(Ok((value, endpoint, label))) => {
            if path.starts_with("/api/status") {
                if let Some(ip) = value.get("ipAddress").and_then(Value::as_str).filter(|ip| is_private_or_local_ipv4(ip)) {
                    if let Ok(mut cached) = state.last_known_local_ip.lock() { *cached = Some(ip.to_string()); }
                }
            }
            add_log(state, &endpoint, true, format!("Sikeres kérés ({label})"));
            Ok(value)
        }
        Ok(Err(error)) => {
            let endpoint = format!("Arduino API: {path}");
            add_log(state, &endpoint, false, error.clone());
            Err(error)
        }
        Err(error) => {
            let message = format!("Arduino háttérfeladat hiba: {error}");
            add_log(state, &format!("Arduino API: {path}"), false, message.clone());
            Err(message)
        }
    }
}

fn normalize_console_response(value: Value) -> Result<Value, String> {
    let provided_last_id = value.get("lastId").and_then(Value::as_u64).unwrap_or(0);
    let logs = if let Some(items) = value.as_array() {
        items.clone()
    } else if let Some(items) = value.get("logs").and_then(Value::as_array) {
        items.clone()
    } else if let Some(items) = value.get("lines").and_then(Value::as_array) {
        items.clone()
    } else {
        return Err("Az Arduino konzolválasza nem tartalmaz logs vagy lines listát.".into());
    };

    let detected_last_id = logs
        .iter()
        .filter_map(|entry| entry.get("id").and_then(Value::as_u64))
        .max()
        .unwrap_or(0);

    Ok(serde_json::json!({
        "lastId": provided_last_id.max(detected_last_id),
        "logs": logs
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArduinoScheduleStatus {
    #[serde(default)]
    schedule_count: u8,
}

#[derive(Debug, Deserialize)]
struct ArduinoScheduleExport {
    index: u8,
    count: u8,
    payload: String,
}

fn decode_schedule_payload(payload: &str, index: u8) -> Result<Schedule, String> {
    let bytes = hex::decode(payload).map_err(|e| format!("Hibás időzítési HEX-adat: {e}"))?;
    if bytes.len() != 27 {
        return Err(format!("Hibás időzítési rekordméret: {} bájt, 27 helyett.", bytes.len()));
    }

    let day = bytes[0];
    let hour = bytes[1];
    let minute = bytes[2];
    if !(1..=7).contains(&day) || hour > 23 || minute > 59 {
        return Err("Az Arduino érvénytelen napot vagy időpontot adott vissza.".into());
    }

    let mut leds = Vec::new();
    for led_index in 0..3usize {
        let at = 3 + led_index * 8;
        if bytes[at] == 0 { continue; }
        leds.push(ScheduleLed {
            id: (led_index + 1) as u8,
            enabled: bytes[at + 1] != 0,
            brightness: bytes[at + 2],
            effect: bytes[at + 3],
            speed: bytes[at + 4].clamp(1, 100),
            color: vec![bytes[at + 5], bytes[at + 6], bytes[at + 7]],
        });
    }

    Ok(Schedule {
        id: format!("arduino-{index}"),
        day,
        time: format!("{hour:02}:{minute:02}"),
        leds,
    })
}

async fn fetch_schedules(state: &AppState) -> Result<Vec<Schedule>, String> {
    let status: ArduinoScheduleStatus = serde_json::from_value(get_json(state, "/api/status").await?)
        .map_err(|e| format!("Az Arduino státuszválasza hibás: {e}"))?;

    let mut all = Vec::with_capacity(status.schedule_count as usize);
    for index in 0..status.schedule_count {
        let exported: ArduinoScheduleExport = serde_json::from_value(
            get_json(state, &format!("/api/schedules/export?index={index}")).await?
        ).map_err(|e| format!("A(z) {index}. időzítés exportválasza hibás: {e}"))?;

        if exported.index != index || exported.count != status.schedule_count {
            return Err(format!("Az Arduino időzítés-export sorszáma eltér: várt {index}/{}, kapott {}/{}.", status.schedule_count, exported.index, exported.count));
        }
        all.push(decode_schedule_payload(&exported.payload, index)?);
    }

    all.sort_by(|a, b| a.day.cmp(&b.day).then(a.time.cmp(&b.time)));
    Ok(all)
}

fn validate_schedules(items: &[Schedule]) -> Result<(), String> {
    if items.len() > 60 { return Err("Az Arduino legfeljebb 60 időzítést tárolhat.".into()); }
    for s in items {
        if !(1..=7).contains(&s.day) || s.time.len() != 5 || s.leds.is_empty() { return Err("Érvénytelen időzítés.".into()); }
        let mut parts = s.time.split(':');
        let h: u8 = parts.next().and_then(|v| v.parse().ok()).ok_or("Hibás idő")?;
        let m: u8 = parts.next().and_then(|v| v.parse().ok()).ok_or("Hibás idő")?;
        if h > 23 || m > 59 { return Err("Hibás időérték.".into()); }
        for l in &s.leds {
            if !(1..=3).contains(&l.id) || l.effect > 4 || !(1..=100).contains(&l.speed) || l.color.len() != 3 { return Err("Érvénytelen LED-időzítés.".into()); }
        }
    }
    Ok(())
}

fn encode_schedule(s: &Schedule) -> Result<String, String> {
    let mut parts = s.time.split(':');
    let hour: u8 = parts.next().and_then(|v| v.parse().ok()).ok_or("Hibás idő")?;
    let minute: u8 = parts.next().and_then(|v| v.parse().ok()).ok_or("Hibás idő")?;
    let mut bytes = vec![s.day, hour, minute];
    for id in 1..=3u8 {
        if let Some(l) = s.leds.iter().find(|l| l.id == id) {
            bytes.extend_from_slice(&[1, l.enabled as u8, l.brightness, l.effect, l.speed, l.color[0], l.color[1], l.color[2]]);
        } else { bytes.extend_from_slice(&[0; 8]); }
    }
    Ok(hex::encode(bytes))
}

#[derive(Debug, Deserialize)] struct GitHubRelease { tag_name: String, published_at: Option<String>, body: Option<String>, assets: Vec<GitHubAsset> }
#[derive(Debug, Deserialize)] struct GitHubAsset { name: String, browser_download_url: String }

const FIRMWARE_REPOSITORY: &str = "LexyGuru/arduino-led-controller";
const FIRMWARE_RELEASE_TAG: &str = "firmware-latest";
const OTA_UPLOAD_PORT: u16 = 65280;

async fn latest_firmware(_config: &Config) -> Result<FirmwareArtifact, String> {
    let url = format!("https://api.github.com/repos/{}/releases/tags/{}", FIRMWARE_REPOSITORY, FIRMWARE_RELEASE_TAG);
    let client = reqwest::Client::builder().timeout(Duration::from_secs(25)).build().map_err(|e| e.to_string())?;
    let release: GitHubRelease = client.get(url).header("User-Agent", "arduino-led-controller-tauri").header("Accept", "application/vnd.github+json")
        .send().await.map_err(|e| format!("GitHub kapcsolati hiba: {e}"))?.error_for_status().map_err(|e| format!("GitHub válaszhiba: {e}"))?.json().await.map_err(|e| e.to_string())?;
    let binary = release.assets.iter().find(|a| a.name.ends_with(".ino.bin")).ok_or("A kiadás nem tartalmaz .ino.bin firmware-t.")?;
    let checksum = release.assets.iter().find(|a| a.name.ends_with(".ino.bin.sha256")).ok_or("A kiadás nem tartalmaz SHA-256 fájlt.")?;
    let version = release.body.as_deref().and_then(|b| b.lines().find_map(|line| line.strip_prefix("Firmware verzió:").map(|v| v.trim().to_string())));
    Ok(FirmwareArtifact { name: binary.name.clone(), download_url: binary.browser_download_url.clone(), checksum_url: checksum.browser_download_url.clone(), firmware_version: version, tag: release.tag_name, created_at: release.published_at })
}


fn executable_name() -> &'static str {
    #[cfg(windows)] { return "arduinoOTA.exe"; }
    #[cfg(not(windows))] { return "arduinoOTA"; }
}

fn recursive_find_ota(root: &Path, depth: usize) -> Option<PathBuf> {
    if depth == 0 || !root.exists() { return None; }
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.file_name().and_then(|n| n.to_str()) == Some(executable_name()) {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = recursive_find_ota(&path, depth - 1) { return Some(found); }
        }
    }
    None
}

fn ota_tool_works(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Err("A fájl nem létezik.".into());
    }
    let output = Command::new(path)
        .arg("-version")
        .output()
        .map_err(|e| format!("Nem indítható: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else if !stdout.is_empty() { stdout } else { format!("kilépési állapot: {}", output.status) };
        Err(format!("Az arduinoOTA nem működik: {detail}"))
    }
}

fn find_ota_tool(app: &AppHandle) -> Result<PathBuf, String> {
    let name = executable_name();
    let mut candidates: Vec<PathBuf> = Vec::new();

    // A grafikus macOS alkalmazások PATH-ja gyakran nem tartalmazza ezeket.
    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from("/usr/local/bin/arduinoOTA"));
        candidates.push(PathBuf::from("/opt/homebrew/bin/arduinoOTA"));
    }
    #[cfg(target_os = "linux")]
    {
        candidates.push(PathBuf::from("/usr/local/bin/arduinoOTA"));
        candidates.push(PathBuf::from("/usr/bin/arduinoOTA"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("tools").join("arduinoOTA").join(name));
        candidates.push(resource_dir.join(name));
    }
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("tools").join("arduinoOTA").join(name));
            candidates.push(dir.join(name));
        }
    }
    if let Some(path_var) = env::var_os("PATH") {
        for dir in env::split_paths(&path_var) { candidates.push(dir.join(name)); }
    }

    let mut invalid: Vec<String> = Vec::new();
    for candidate in candidates {
        if candidate.is_file() {
            match ota_tool_works(&candidate) {
                Ok(()) => return Ok(candidate),
                Err(e) => invalid.push(format!("{}: {e}", candidate.display())),
            }
        }
    }

    let mut roots: Vec<PathBuf> = Vec::new();
    if let Some(home) = env::var_os("HOME") {
        let home = PathBuf::from(home);
        roots.push(home.join("Library/Arduino15/packages/arduino/tools/arduinoOTA"));
        roots.push(home.join(".arduino15/packages/arduino/tools/arduinoOTA"));
    }
    if let Some(local) = env::var_os("LOCALAPPDATA") {
        roots.push(PathBuf::from(local).join("Arduino15/packages/arduino/tools/arduinoOTA"));
    }
    for root in roots {
        if let Some(found) = recursive_find_ota(&root, 8) {
            match ota_tool_works(&found) {
                Ok(()) => return Ok(found),
                Err(e) => invalid.push(format!("{}: {e}", found.display())),
            }
        }
    }

    if invalid.is_empty() {
        Err("Az arduinoOTA feltöltő nincs telepítve. Telepítsd az Arduino IDE/CLI arduinoOTA eszközét. macOS Apple Silicon esetén a működő program ajánlott helye: /usr/local/bin/arduinoOTA.".into())
    } else {
        Err(format!("Találtam arduinoOTA fájlt, de egyik sem futtatható: {}", invalid.join(" | ")))
    }
}

fn normalize_version(value: &str) -> String {
    value.trim().trim_start_matches('v').to_ascii_lowercase()
}

fn read_ota_password(app: &AppHandle) -> Result<String, String> { Ok(fs::read_to_string(secret_path(app)?).unwrap_or_default().trim().to_string()) }
fn write_ota_password(app: &AppHandle, password: &str) -> Result<(), String> {
    let path = secret_path(app)?;
    fs::write(&path, password.as_bytes()).map_err(|e| e.to_string())?;
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn ota_target_from_status(config: &Config, status: &Value) -> Result<(String, u16), String> {
    if status.get("otaEnabled").and_then(Value::as_bool) == Some(false) {
        return Err("Az Arduino OTA szolgáltatása nem aktív.".into());
    }

    let address = status
        .get("ipAddress")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "0.0.0.0")
        .unwrap_or(config.arduino_ip.trim())
        .to_string();
    if address.is_empty() {
        return Err("Az OTA célcíme nem állapítható meg.".into());
    }

    let port = status
        .get("otaPort")
        .and_then(Value::as_u64)
        .filter(|value| (1..=u16::MAX as u64).contains(value))
        .map(|value| value as u16)
        .unwrap_or(OTA_UPLOAD_PORT);
    Ok((address, port))
}

async fn confirm_restart(state: &AppState, expected: Option<String>) -> Result<Option<String>, String> {
    for attempt in 0..30 {
        tokio::time::sleep(if attempt == 0 {
            Duration::from_secs(3)
        } else {
            Duration::from_secs(2)
        })
        .await;
        if let Ok(status) = get_json(state, "/api/status").await {
            let installed = status
                .get("firmwareVersion")
                .and_then(Value::as_str)
                .map(str::to_string);
            match (&expected, &installed) {
                (Some(wanted), Some(actual))
                    if normalize_version(wanted) == normalize_version(actual) =>
                {
                    return Ok(installed.clone());
                }
                (None, Some(_)) => return Ok(installed.clone()),
                _ => {}
            }
        }
    }
    match expected {
        Some(version) => Err(format!("Az Arduino újra elérhetővé válása vagy a(z) {version} firmware visszaigazolása nem történt meg.")),
        None => Err("Az Arduino az OTA-frissítés után nem jelentkezett vissza.".into()),
    }
}

#[tauri::command] fn load_config(state: State<AppState>) -> Result<Config, String> { Ok(state.config.lock().map_err(|_| "Beállítás zárolva".to_string())?.clone()) }
#[tauri::command] fn save_config(app: AppHandle, state: State<AppState>, config: Config) -> Result<(), String> {
    validate_config(&config)?;
    fs::write(config_path(&app)?, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    *state.config.lock().map_err(|_| "Beállítás zárolva".to_string())? = config;
    if let Ok(mut cached) = state.last_known_local_ip.lock() { *cached = None; }
    Ok(())
}
#[tauri::command] fn save_ota_password(app: AppHandle, password: String) -> Result<(), String> { write_ota_password(&app, &password) }
#[tauri::command]
async fn arduino_status(state: State<'_, AppState>) -> Result<Value, String> {
    get_json(&state, "/api/status").await
}

#[tauri::command]
async fn arduino_logs(state: State<'_, AppState>, after_id: u32) -> Result<Value, String> {
    let value = get_json(&state, &format!("/api/console/logs?after={after_id}")).await?;
    normalize_console_response(value)
}
#[tauri::command] fn network_logs(state: State<AppState>) -> Result<Vec<NetworkLog>, String> { Ok(state.network_logs.lock().map_err(|_| "Napló zárolva".to_string())?.clone()) }
#[tauri::command] async fn set_led(state: State<'_, AppState>, id: u8, enabled: bool, brightness: u8, effect: u8, speed: u8, color: Vec<u8>) -> Result<Value, String> {
    if !(1..=3).contains(&id) || color.len() != 3 || effect > 4 || speed == 0 { return Err("Érvénytelen LED-beállítás.".into()); }
    get_json(&state, &format!("/api/led/{id}?enabled={}&brightness={brightness}&effect={effect}&speed={speed}&color={},{},{}", enabled as u8, color[0], color[1], color[2])).await
}
#[tauri::command]
fn load_schedules(app: AppHandle) -> Result<Vec<Schedule>, String> {
    let path = schedules_path(&app)?;
    if !path.exists() { return Ok(Vec::new()); }
    let bytes = fs::read(path).map_err(|e| format!("A helyi időzítésfájl nem olvasható: {e}"))?;
    parse_schedules_json(&bytes)
}

#[tauri::command]
fn import_schedules_file(path: String) -> Result<Vec<Schedule>, String> {
    let bytes = fs::read(&path).map_err(|e| format!("A kiválasztott fájl nem olvasható: {e}"))?;
    parse_schedules_json(&bytes)
}

#[tauri::command]
fn export_schedules_file(path: String, schedules: Vec<Schedule>) -> Result<(), String> {
    let mut output = PathBuf::from(path);
    if output.extension().and_then(|v| v.to_str()).map(|v| !v.eq_ignore_ascii_case("json")).unwrap_or(true) {
        output.set_extension("json");
    }
    let bytes = schedule_file_bytes(schedules)?;
    fs::write(&output, bytes).map_err(|e| format!("A JSON-fájl nem menthető: {e}"))
}
#[tauri::command] async fn load_schedules_from_arduino(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<Schedule>, String> {
    let schedules = fetch_schedules(&state).await?;
    fs::write(schedules_path(&app)?, schedule_file_bytes(schedules.clone())?).map_err(|e| e.to_string())?;
    Ok(schedules)
}
#[tauri::command] async fn save_and_sync_schedules(app: AppHandle, state: State<'_, AppState>, schedules: Vec<Schedule>) -> Result<Value, String> {
    validate_schedules(&schedules)?;
    fs::write(schedules_path(&app)?, schedule_file_bytes(schedules.clone())?).map_err(|e| e.to_string())?;
    if schedules.is_empty() {
        get_json(&state, "/api/schedules/clear").await?;
        let verified = fetch_schedules(&state).await?;
        if !verified.is_empty() {
            return Err(format!("Az Arduino törlés után még {} időzítést jelent.", verified.len()));
        }
        return Ok(serde_json::json!({"success":true,"count":0,"verifiedCount":0}));
    }
    let total = schedules.len();
    let mut last = Value::Null;
    for (index, schedule) in schedules.iter().enumerate() {
        let payload = encode_schedule(schedule)?;
        last = get_json(&state, &format!("/api/schedules/chunk?index={index}&total={total}&payload={payload}")).await?;
    }
    let count = last.get("count").and_then(Value::as_u64).unwrap_or(0) as usize;
    if count != total { return Err(format!("Az Arduino csak {count}/{total} időzítést mentett el.")); }
    let verified = fetch_schedules(&state).await?;
    Ok(serde_json::json!({"success":true,"count":count,"verifiedCount":verified.len()}))
}
#[tauri::command]
async fn firmware_status(app: AppHandle, state: State<'_, AppState>) -> Result<FirmwareStatus, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let mut status = FirmwareStatus {
        state: "idle".into(),
        message: "Nincs folyamatban firmware-frissítés.".into(),
        ..Default::default()
    };

    if let Ok(value) = get_json(&state, "/api/status").await {
        status.arduino_online = true;
        status.installed_version = value
            .get("firmwareVersion")
            .and_then(Value::as_str)
            .map(str::to_string);
        if let Ok((address, port)) = ota_target_from_status(&config, &value) {
            status.ota_target_address = Some(address);
            status.ota_target_port = Some(port);
        }
    }

    match find_ota_tool(&app) {
        Ok(path) => {
            status.ota_tool_installed = true;
            status.ota_tool_path = Some(path.to_string_lossy().to_string());
        }
        Err(error) => {
            status.ota_tool_installed = false;
            status.ota_tool_error = Some(error);
        }
    }
    status.ota_password_configured = !read_ota_password(&app)?.is_empty();

    match latest_firmware(&config).await {
        Ok(artifact) => {
            let available_version = artifact
                .firmware_version
                .as_deref()
                .unwrap_or(&artifact.tag);
            status.update_available = status
                .installed_version
                .as_deref()
                .map(|installed| {
                    normalize_version(installed) != normalize_version(available_version)
                })
                .unwrap_or(true);
            status.message = if status.arduino_online && !status.update_available {
                format!(
                    "A firmware naprakész: {}.",
                    status
                        .installed_version
                        .clone()
                        .unwrap_or_else(|| available_version.to_string())
                )
            } else if status.update_available {
                format!("Új firmware érhető el: {}.", available_version)
            } else {
                "A firmware állapota ellenőrizve.".into()
            };
            status.available_firmware = Some(artifact);
        }
        Err(error) => status.firmware_lookup_error = Some(error),
    }

    *state
        .firmware_status
        .lock()
        .map_err(|_| "Firmware állapot zárolva".to_string())? = status.clone();
    Ok(status)
}

async fn firmware_update_inner(
    app: &AppHandle,
    state: &AppState,
) -> Result<FirmwareStatus, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let password = read_ota_password(app)?;
    if password.is_empty() {
        return Err("Hiányzik az OTA-jelszó.".into());
    }

    let ota_tool = find_ota_tool(app)?;
    let artifact = latest_firmware(&config).await?;
    let status_json = get_json(state, "/api/status")
        .await
        .map_err(|error| format!("OTA indítás előtt nem olvasható az Arduino státusza: {error}"))?;
    let installed = status_json
        .get("firmwareVersion")
        .and_then(Value::as_str)
        .map(str::to_string);
    let available = artifact
        .firmware_version
        .as_deref()
        .unwrap_or(&artifact.tag);
    if installed.as_deref().map(normalize_version) == Some(normalize_version(available)) {
        return Err(format!(
            "Nincs szükség frissítésre. A telepített és az elérhető firmware-verzió egyaránt {}.",
            installed.unwrap_or_else(|| available.to_string())
        ));
    }

    let (ota_address, ota_port) = ota_target_from_status(&config, &status_json)?;
    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "downloading".into();
        current.message = "Firmware letöltése…".into();
        current.available_firmware = Some(artifact.clone());
        current.ota_target_address = Some(ota_address.clone());
        current.ota_target_port = Some(ota_port);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())?;
    let firmware = client
        .get(&artifact.download_url)
        .header("User-Agent", "arduino-led-controller-tauri/3.0.10")
        .send()
        .await
        .map_err(|e| format!("Firmware letöltési hiba: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Firmware letöltési HTTP-hiba: {e}"))?
        .bytes()
        .await
        .map_err(|e| format!("Firmware olvasási hiba: {e}"))?;
    if firmware.len() < 1024 {
        return Err("A firmware túl kicsi vagy sérült.".into());
    }

    let checksum_text = client
        .get(&artifact.checksum_url)
        .header("User-Agent", "arduino-led-controller-tauri/3.0.10")
        .send()
        .await
        .map_err(|e| format!("Checksum letöltési hiba: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Checksum HTTP-hiba: {e}"))?
        .text()
        .await
        .map_err(|e| format!("Checksum olvasási hiba: {e}"))?;
    let expected = checksum_text
        .split_whitespace()
        .next()
        .ok_or("Üres checksum fájl")?
        .to_lowercase();
    let actual = hex::encode(Sha256::digest(&firmware));
    if expected.len() != 64 || expected != actual {
        return Err("A firmware SHA-256 ellenőrzése sikertelen.".into());
    }

    let binary_path = firmware_dir(app)?.join("latest-arduino-firmware.bin");
    fs::write(&binary_path, &firmware).map_err(|e| e.to_string())?;
    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "uploading".into();
        current.message = format!(
            "Firmware feltöltése: {}:{}…",
            ota_address, ota_port
        );
    }

    let ota_tool_for_command = ota_tool.clone();
    let ota_address_for_command = ota_address.clone();
    let ota_port_text = ota_port.to_string();
    let password_for_command = password.clone();
    let binary_string = binary_path.to_string_lossy().to_string();
    let ota_request_lock = Arc::clone(&state.arduino_request_lock);
    state.ota_in_progress.store(true, Ordering::SeqCst);
    let output_result = tauri::async_runtime::spawn_blocking(move || -> Result<std::process::Output, String> {
        // Ugyanazt a zárat tartjuk a teljes OTA alatt, amelyet a HTTP-kérések is
        // használnak, ezért státusz- vagy konzollekérés nem zavarhatja a feltöltést.
        let _guard = ota_request_lock
            .lock()
            .map_err(|_| "Az Arduino kérési sor zárolása megsérült.".to_string())?;
        Command::new(&ota_tool_for_command)
            .args([
                "-address",
                ota_address_for_command.as_str(),
                "-port",
                ota_port_text.as_str(),
                "-username",
                "arduino",
                "-password",
                password_for_command.as_str(),
                "-sketch",
                binary_string.as_str(),
                "-upload",
                "/sketch",
                "-b",
            ])
            .output()
            .map_err(|e| format!("Az OTA feltöltő nem indítható: {e}"))
    })
    .await;
    state.ota_in_progress.store(false, Ordering::SeqCst);
    let output = output_result
        .map_err(|e| format!("Az OTA háttérfeladat megszakadt: {e}"))??;

    if !output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let details = match (stdout.is_empty(), stderr.is_empty()) {
            (false, false) => format!("{stderr}\n{stdout}"),
            (false, true) => stdout,
            (true, false) => stderr,
            (true, true) => format!("Az arduinoOTA hibakóddal állt le: {}", output.status),
        };
        return Err(format!(
            "OTA feltöltési hiba ({}:{}): {}. A HTTP/API kapcsolat címe: {}:{}.",
            ota_address, ota_port, details, config.arduino_ip, config.arduino_port
        ));
    }

    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "restarting".into();
        current.message = "Az Arduino újraindul és visszaellenőrzésre vár…".into();
    }
    let installed_after_restart = confirm_restart(state, artifact.firmware_version.clone()).await?;
    let final_status = FirmwareStatus {
        state: "success".into(),
        message: format!(
            "Firmware sikeresen telepítve: {}",
            installed_after_restart
                .clone()
                .unwrap_or_else(|| artifact.tag.clone())
        ),
        installed_version: installed_after_restart,
        arduino_online: true,
        ota_tool_installed: true,
        ota_password_configured: true,
        available_firmware: Some(artifact),
        firmware_lookup_error: None,
        ota_tool_path: Some(ota_tool.to_string_lossy().to_string()),
        ota_tool_error: None,
        ota_target_address: Some(ota_address),
        ota_target_port: Some(ota_port),
        update_available: false,
    };
    *state
        .firmware_status
        .lock()
        .map_err(|_| "Firmware állapot zárolva".to_string())? = final_status.clone();
    Ok(final_status)
}

#[tauri::command]
async fn firmware_update(app: AppHandle, state: State<'_, AppState>) -> Result<FirmwareStatus, String> {
    match firmware_update_inner(&app, &state).await {
        Ok(status) => Ok(status),
        Err(error) => {
            state.ota_in_progress.store(false, Ordering::SeqCst);
            if let Ok(mut current) = state.firmware_status.lock() {
                current.state = "error".into();
                current.message = error.clone();
            }
            Err(error)
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_length_is_case_insensitive() {
        let headers = "HTTP/1.1 200 OK\r\ncontent-length: 42\r\nConnection: close";
        assert_eq!(parse_content_length(headers), Some(42));
    }

    #[test]
    fn console_object_is_normalized() {
        let input = serde_json::json!({
            "lastId": 7,
            "logs": [
                {"id": 6, "timestamp": "10s", "type": "info", "message": "A"},
                {"id": 7, "timestamp": "11s", "type": "success", "message": "B"}
            ]
        });
        let output = normalize_console_response(input).expect("normalizálható konzolválasz");
        assert_eq!(output.get("lastId").and_then(Value::as_u64), Some(7));
        assert_eq!(output.get("logs").and_then(Value::as_array).map(Vec::len), Some(2));
    }

    #[test]
    fn console_array_gets_detected_last_id() {
        let input = serde_json::json!([
            {"id": 2, "timestamp": "1s", "type": "info", "message": "A"},
            {"id": 9, "timestamp": "2s", "type": "info", "message": "B"}
        ]);
        let output = normalize_console_response(input).expect("normalizálható konzoltömb");
        assert_eq!(output.get("lastId").and_then(Value::as_u64), Some(9));
    }

    #[test]
    fn ota_target_prefers_arduino_status() {
        let config = Config {
            arduino_ip: "lexyguruhome.ddns.net".into(),
            arduino_port: 25666,
            ..Config::default()
        };
        let status = serde_json::json!({
            "ipAddress": "10.0.0.123",
            "otaPort": 65280,
            "otaEnabled": true
        });
        assert_eq!(
            ota_target_from_status(&config, &status).expect("OTA cél"),
            ("10.0.0.123".to_string(), 65280)
        );
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let config = fs::read(config_path(app.handle()).map_err(std::io::Error::other)?).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
            app.manage(AppState {
                config: Mutex::new(config),
                network_logs: Mutex::new(Vec::new()),
                firmware_status: Mutex::new(FirmwareStatus::default()),
                arduino_request_lock: Arc::new(Mutex::new(())),
                ota_in_progress: Arc::new(AtomicBool::new(false)),
                last_known_local_ip: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_config, save_config, save_ota_password, arduino_status, arduino_logs, network_logs, set_led, load_schedules, import_schedules_file, export_schedules_file, load_schedules_from_arduino, save_and_sync_schedules, firmware_status, firmware_update])
        .run(tauri::generate_context!())
        .expect("Tauri application error");
}
