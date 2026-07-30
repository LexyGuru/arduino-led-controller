use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{ErrorKind, Read, Write},
    net::{Ipv4Addr, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};

mod credential_bridge;

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
    // OTA cél teljesen független a HTTP API címétől. Üresen a távoli/DDNS Arduino-címet használja.
    ota_address: String,
    ota_port: u16,
    // auto | native | terminal
    ota_upload_mode: String,
    ota_tool_path: String,
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
            ota_address: String::new(),
            ota_port: 65280,
            ota_upload_mode: "auto".into(),
            ota_tool_path: "/usr/local/bin/arduinoOTA".into(),
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
    progress: Option<u8>,
    phase: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtaProgressEvent {
    timestamp: u64,
    stage: String,
    level: String,
    message: String,
    progress: Option<u8>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
    platform: String,
    mobile: bool,
    ota_supported: bool,
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


fn unix_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn emit_ota_progress(
    app: &AppHandle,
    stage: &str,
    level: &str,
    message: impl Into<String>,
    progress: Option<u8>,
) {
    let payload = OtaProgressEvent {
        timestamp: unix_millis(),
        stage: stage.to_string(),
        level: level.to_string(),
        message: message.into(),
        progress,
    };
    let _ = app.emit("ota-progress", payload);
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
    validate_host(c.ota_address.trim(), "OTA DDNS/IP-cím")?;
    if !remote.is_empty() && c.arduino_port == 0 { return Err("Érvénytelen távoli HTTP-port.".into()); }
    if !local.is_empty() && c.local_arduino_port == 0 { return Err("Érvénytelen helyi HTTP-port.".into()); }
    if c.ota_port == 0 { return Err("Érvénytelen OTA feltöltési port.".into()); }
    if !matches!(c.ota_upload_mode.as_str(), "auto" | "native" | "terminal") {
        return Err("Az OTA feltöltési mód csak auto, native vagy terminal lehet.".into());
    }
    Ok(())
}

fn protected_path(c: &Config, path: &str) -> Result<String, String> {
    let prefix = c.arduino_api_path.trim_end_matches('/');
    if prefix.is_empty() { return Ok(path.to_string()); }
    if prefix.len() < 18 || !prefix.starts_with('/') {
        return Err("A védett API-útvonal nincs megfelelően beállítva.".into());
    }
    Ok(format!("{prefix}{path}"))
}

fn device_key_header_value(c: &Config) -> Result<&str, String> {
    let value = c.arduino_api_key.trim();
    if value.len() < 24
        || value.len() > 64
        || !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte))
    {
        return Err("Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként.".into());
    }
    Ok(value)
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
    let device_key = device_key_header_value(c)?;
    let request = format!(
        "GET {request_path} HTTP/1.1\r\nHost: {host}:{}\r\nUser-Agent: Arduino-LED-Controller-Tauri/3.0.19\r\nAccept: application/json\r\nX-Device-Key: {device_key}\r\nConnection: close\r\n\r\n",
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


fn normalize_version(value: &str) -> String {
    value.trim().trim_start_matches('v').to_ascii_lowercase()
}

fn safe_firmware_filename(name: &str) -> String {
    let original = Path::new(name)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("ArduinoLedController.ino.bin");
    let sanitized: String = original
        .chars()
        .map(|value| {
            if value.is_ascii_alphanumeric() || matches!(value, '.' | '_' | '-') {
                value
            } else {
                '_'
            }
        })
        .collect();
    if sanitized.is_empty() || !sanitized.to_ascii_lowercase().ends_with(".bin") {
        "ArduinoLedController.ino.bin".to_string()
    } else {
        sanitized
    }
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

fn status_ota_target(status: &Value) -> Result<(String, u16), String> {
    if status.get("otaEnabled").and_then(Value::as_bool) == Some(false) {
        return Err("Az Arduino OTA szolgáltatása nem aktív.".into());
    }

    let address = status
        .get("ipAddress")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "0.0.0.0")
        .ok_or("Az Arduino státuszválasza nem tartalmaz használható ipAddress mezőt.")?
        .to_string();

    let port = status
        .get("otaPort")
        .and_then(Value::as_u64)
        .filter(|value| (1..=u16::MAX as u64).contains(value))
        .map(|value| value as u16)
        .unwrap_or(OTA_UPLOAD_PORT);

    Ok((address, port))
}

fn ota_target_from_status(config: &Config, status: &Value, terminal_mode: bool) -> Result<(String, u16), String> {
    // A macOS Terminal külön folyamatként fut, ezért ott mindig az Arduino
    // saját, aktuális LAN-címét használjuk. Ezt minden OTA előtt frissen az
    // /api/status ipAddress és otaPort mezőiből olvassuk ki; nincs beégetett IP.
    if terminal_mode {
        return status_ota_target(status);
    }

    if status.get("otaEnabled").and_then(Value::as_bool) == Some(false) {
        return Err("Az Arduino OTA szolgáltatása nem aktív.".into());
    }

    // A beépített Tauri kliensnél megmarad a külön beállítható cél, mert a
    // macOS alkalmazásfolyamat hálózati jogosultságai eltérhetnek a Terminalétól.
    let configured_ota = config.ota_address.trim();
    let remote_http_host = config.arduino_ip.trim();
    let status_ip = status
        .get("ipAddress")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "0.0.0.0")
        .unwrap_or("");

    let address = if !configured_ota.is_empty() {
        configured_ota
    } else if !remote_http_host.is_empty() {
        remote_http_host
    } else {
        status_ip
    }
    .to_string();

    if address.is_empty() {
        return Err("Az OTA célcíme nem állapítható meg.".into());
    }

    let port = if config.ota_port > 0 {
        config.ota_port
    } else {
        status
            .get("otaPort")
            .and_then(Value::as_u64)
            .filter(|value| (1..=u16::MAX as u64).contains(value))
            .map(|value| value as u16)
            .unwrap_or(OTA_UPLOAD_PORT)
    };
    Ok((address, port))
}

fn ota_tool_works(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    Command::new(path)
        .arg("-version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn find_ota_tool(app: &AppHandle, config: &Config) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    let configured = config.ota_tool_path.trim();
    if !configured.is_empty() {
        candidates.push(PathBuf::from(configured));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from("/usr/local/bin/arduinoOTA"));
        candidates.push(PathBuf::from("/opt/homebrew/bin/arduinoOTA"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("tools").join("arduinoOTA").join("arduinoOTA"));
        candidates.push(resource_dir.join("arduinoOTA"));
    }

    candidates.into_iter().find(|candidate| ota_tool_works(candidate))
}

fn use_terminal_ota(app: &AppHandle, config: &Config) -> Result<bool, String> {
    match config.ota_upload_mode.trim() {
        "native" => Ok(false),
        "terminal" => {
            #[cfg(target_os = "macos")]
            {
                if find_ota_tool(app, config).is_none() {
                    return Err("A Terminal OTA mód van kiválasztva, de nem található működő arduinoOTA feltöltő.".into());
                }
                Ok(true)
            }
            #[cfg(not(target_os = "macos"))]
            {
                Err("A Terminal OTA mód csak macOS-en használható.".into())
            }
        }
        _ => {
            #[cfg(target_os = "macos")]
            {
                Ok(find_ota_tool(app, config).is_some())
            }
            #[cfg(not(target_os = "macos"))]
            {
                Ok(false)
            }
        }
    }
}

fn percentage_from_ota_line(line: &str) -> Option<u8> {
    let percent_at = line.find('%')?;
    let bytes = line.as_bytes();
    let mut start = percent_at;
    while start > 0 && bytes[start - 1].is_ascii_digit() {
        start -= 1;
    }
    if start == percent_at {
        return None;
    }
    line[start..percent_at].parse::<u8>().ok().map(|value| value.min(100))
}

fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[cfg(target_os = "macos")]
async fn upload_firmware_in_terminal(
    app: &AppHandle,
    config: &Config,
    address: &str,
    port: u16,
    password: &str,
    binary_path: &Path,
) -> Result<String, String> {
    use std::os::unix::fs::PermissionsExt;

    let tool = find_ota_tool(app, config).ok_or_else(|| {
        "A macOS Terminal módhoz nem található működő arduinoOTA. Ellenőrzött helyek: a beállított útvonal, /usr/local/bin/arduinoOTA és /opt/homebrew/bin/arduinoOTA.".to_string()
    })?;
    let work_dir = firmware_dir(app)?.join("terminal-ota");
    fs::create_dir_all(&work_dir).map_err(|error| format!("Az OTA Terminal munkamappa nem hozható létre: {error}"))?;

    let run_id = unix_millis();
    let script_path = work_dir.join(format!("ota-upload-{run_id}.command"));
    let log_path = work_dir.join(format!("ota-upload-{run_id}.log"));
    let exit_path = work_dir.join(format!("ota-upload-{run_id}.exit"));
    let secret_path = work_dir.join(format!("ota-upload-{run_id}.secret"));

    fs::write(&secret_path, password.as_bytes())
        .map_err(|error| format!("Az ideiglenes OTA-jelszófájl nem írható: {error}"))?;
    fs::set_permissions(&secret_path, fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("Az OTA-jelszófájl jogosultsága nem állítható be: {error}"))?;

    let script = format!(
        r#"#!/bin/zsh
set -o pipefail
TOOL={}
ADDRESS={}
PORT={}
BINARY={}
LOG={}
EXIT_FILE={}
SECRET_FILE={}
trap 'rm -f "$SECRET_FILE" "$0"' EXIT
PASSWORD="$(cat "$SECRET_FILE")"
rm -f "$SECRET_FILE" "$EXIT_FILE"
print -r -- "[Tauri OTA] Aktuális Arduino IP: $ADDRESS" | tee -a "$LOG"
print -r -- "[Tauri OTA] OTA port: $PORT" | tee -a "$LOG"
print -r -- "[Tauri OTA] Firmware: $BINARY" | tee -a "$LOG"
print -r -- "[Tauri OTA] OTA-port ellenőrzése..." | tee -a "$LOG"
PORT_READY=0
for ATTEMPT in {{1..15}}; do
  if /usr/bin/nc -z -w 1 "$ADDRESS" "$PORT" >/dev/null 2>&1; then
    PORT_READY=1
    print -r -- "[Tauri OTA] OTA-port elérhető (próba: $ATTEMPT/15)." | tee -a "$LOG"
    break
  fi
  print -r -- "[Tauri OTA] OTA-port még zárva; újrapróbálás $ATTEMPT/15..." | tee -a "$LOG"
  /bin/sleep 1
done
if [[ "$PORT_READY" != "1" ]]; then
  print -r -- "[Tauri OTA] HIBA: az Arduino HTTP API-ja elérhető, de az aktuális $ADDRESS:$PORT OTA-port nem hallgat. Indítsd újra az Arduinót vagy használj olyan firmware-t, amely nem zárja le az OTA-listenert." | tee -a "$LOG"
  print -r -- "2" > "$EXIT_FILE"
  exit 2
fi
TIMEOUT_ARGS=()
if "$TOOL" -h 2>&1 | /usr/bin/grep -q -- "-t"; then
  TIMEOUT_ARGS=(-t 90)
  print -r -- "[Tauri OTA] Az arduinoOTA támogatja a hosszabb időkorlátot: 90 másodperc." | tee -a "$LOG"
else
  print -r -- "[Tauri OTA] Az arduinoOTA nem jelzett -t támogatást; a feltöltés után az alkalmazás firmware-verzióval ellenőrzi a tényleges eredményt." | tee -a "$LOG"
fi
"$TOOL" -v "${{TIMEOUT_ARGS[@]}}" -address "$ADDRESS" -port "$PORT" -username arduino -password "$PASSWORD" -sketch "$BINARY" -upload /sketch -b 2>&1 | tee -a "$LOG"
STATUS=${{pipestatus[1]}}
print -r -- "$STATUS" > "$EXIT_FILE"
if [[ "$STATUS" == "0" ]]; then
  print -r -- "[Tauri OTA] Feltöltés sikeresen befejeződött." | tee -a "$LOG"
elif /usr/bin/grep -E -q "Uploading sketch.*done" "$LOG"; then
  print -r -- "[Tauri OTA] A teljes bináris átment, de a feltöltő hibakóddal zárt. A Tauri legfeljebb 3 percig ellenőrzi az Arduino visszatérését és a firmware-verziót." | tee -a "$LOG"
else
  print -r -- "[Tauri OTA] Feltöltési hiba, kilépési kód: $STATUS" | tee -a "$LOG"
fi
exit "$STATUS"
"#,
        shell_single_quote(&tool.to_string_lossy()),
        shell_single_quote(address),
        port,
        shell_single_quote(&binary_path.to_string_lossy()),
        shell_single_quote(&log_path.to_string_lossy()),
        shell_single_quote(&exit_path.to_string_lossy()),
        shell_single_quote(&secret_path.to_string_lossy()),
    );

    fs::write(&script_path, script.as_bytes())
        .map_err(|error| format!("Az OTA Terminal parancsfájl nem írható: {error}"))?;
    fs::set_permissions(&script_path, fs::Permissions::from_mode(0o700))
        .map_err(|error| format!("Az OTA Terminal parancsfájl nem tehető futtathatóvá: {error}"))?;

    emit_ota_progress(
        &app,
        "Terminal",
        "info",
        format!("macOS Terminal megnyitása: {}", script_path.to_string_lossy()),
        Some(53),
    );

    let open_status = Command::new("open")
        .args(["-a", "Terminal"])
        .arg(&script_path)
        .status()
        .map_err(|error| format!("A macOS Terminal nem indítható: {error}"))?;
    if !open_status.success() {
        return Err(format!("A macOS Terminal megnyitása sikertelen: {open_status}"));
    }

    let connection_hint = format!(
        "\n\nA Terminal az Arduino /api/status válaszából kiolvasott aktuális LAN-címet használta: {address}:{port}. Ha a portteszt zárt portot jelez, az nem DNS- vagy firmware-fájlnév-hiba: az Arduino OTA-listenere nem hallgat."
    );

    let event_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let started = SystemTime::now();
        let mut consumed = 0usize;
        let mut pending = String::new();
        let mut recent_lines: Vec<String> = Vec::new();

        loop {
            if let Ok(bytes) = fs::read(&log_path) {
                if bytes.len() > consumed {
                    pending.push_str(&String::from_utf8_lossy(&bytes[consumed..]));
                    consumed = bytes.len();
                    while let Some(newline) = pending.find('\n') {
                        let line = pending[..newline].trim_end_matches('\r').trim().to_string();
                        pending = pending[newline + 1..].to_string();
                        if !line.is_empty() {
                            let raw = percentage_from_ota_line(&line);
                            let progress = raw.map(|value| 55 + ((value as u16 * 35) / 100) as u8);
                            emit_ota_progress(&event_app, "ArduinoOTA Terminal", "output", line.clone(), progress);
                            recent_lines.push(line);
                            if recent_lines.len() > 20 {
                                recent_lines.remove(0);
                            }
                        }
                    }
                }
            }

            if exit_path.exists() {
                if !pending.trim().is_empty() {
                    emit_ota_progress(&event_app, "ArduinoOTA Terminal", "output", pending.trim().to_string(), None);
                }
                let code_text = fs::read_to_string(&exit_path).unwrap_or_default();
                let code = code_text.trim().parse::<i32>().unwrap_or(-1);
                let _ = fs::remove_file(&exit_path);
                if code == 0 {
                    return Ok(tool.to_string_lossy().to_string());
                }
                let details = recent_lines.join("\n");
                let upload_completed = recent_lines.iter().any(|line| {
                    line.contains("Uploading sketch") && line.contains("done")
                });
                let flash_timeout_pattern = recent_lines.iter().any(|line| {
                    line.contains("Flashing sketch") && line.contains("Error flashing the sketch")
                });

                // Ha az arduinoOTA már visszaigazolta a teljes bináris átvitelét,
                // a nem nulla kilépési kód önmagában nem bizonyít sikertelen OTA-t.
                // UNO R4 WiFi esetén a flash alkalmazása és az újraindulás tovább
                // tarthat, mint a feltöltő visszaigazolási időkorlátja. A döntést
                // ezért a következő, legfeljebb 3 perces /api/status ellenőrzés hozza meg.
                if upload_completed {
                    emit_ota_progress(
                        &event_app,
                        "ArduinoOTA Terminal",
                        "info",
                        if flash_timeout_pattern {
                            "A teljes bináris átment. Az arduinoOTA a flash-visszaigazolásnál hibakóddal állt le, ezért a Tauri legfeljebb 3 percig várja az Arduino életjelét és a várt firmware-verziót."
                        } else {
                            "A teljes bináris átment, de az arduinoOTA hibakóddal zárt. A Tauri legfeljebb 3 percig ellenőrzi az Arduino életjelét és a várt firmware-verziót."
                        },
                        Some(90),
                    );
                    return Ok(format!(
                        "VERIFY_REQUIRED:{}",
                        tool.to_string_lossy()
                    ));
                }

                let mut message = format!("A Terminalban futó arduinoOTA hibával állt le (kód: {code}).\n{details}");
                if details.contains("Connecting to board") && details.contains("failed") {
                    message.push_str("\n\nA feltöltő még az Arduino-kapcsolat létrehozása előtt állt le. Ezt nem a firmware fájlneve és nem a bináris tartalma okozza; a fájl SHA-256 ellenőrzése már sikeres volt.");
                    message.push_str(&connection_hint);
                }
                return Err(message);
            }

            if started.elapsed().unwrap_or_default() > Duration::from_secs(300) {
                return Err(format!(
                    "A Terminalban futó arduinoOTA 300 másodperc alatt nem fejeződött be. Napló: {}",
                    log_path.to_string_lossy()
                ));
            }
            std::thread::sleep(Duration::from_millis(250));
        }
    })
    .await
    .map_err(|error| format!("Az OTA Terminal naplófigyelő megszakadt: {error}"))??;

    if let Some(tool) = result.strip_prefix("VERIFY_REQUIRED:") {
        emit_ota_progress(
            app,
            "Terminal",
            "info",
            format!(
                "Az arduinoOTA nem kapta meg időben a flash-visszaigazolást, de a teljes bináris átment. Következik az Arduino újraindulásának és firmware-verziójának ellenőrzése. Feltöltő: {tool}"
            ),
            Some(90),
        );
        return Ok(tool.to_string());
    }

    emit_ota_progress(
        app,
        "Terminal",
        "success",
        format!("A Terminalban futó arduinoOTA sikeresen befejeződött. Feltöltő: {result}"),
        Some(90),
    );
    Ok(result)
}

#[cfg(not(target_os = "macos"))]
async fn upload_firmware_in_terminal(
    _app: &AppHandle,
    _config: &Config,
    _address: &str,
    _port: u16,
    _password: &str,
    _binary_path: &Path,
) -> Result<String, String> {
    Err("A Terminal + arduinoOTA feltöltési mód csak macOS-en használható.".into())
}

fn parse_ota_http_response(response: &[u8]) -> Result<(u16, String), String> {
    let split = response
        .windows(4)
        .position(|part| part == b"\r\n\r\n")
        .ok_or_else(|| "Az Arduino OTA-válaszából hiányzik a HTTP fejléc vége.".to_string())?;
    let headers = String::from_utf8_lossy(&response[..split]);
    let status_line = headers.lines().next().unwrap_or_default();
    let status_code = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| format!("Érvénytelen Arduino OTA HTTP-státusz: {status_line}"))?;
    let body = String::from_utf8_lossy(&response[split + 4..]).trim().to_string();
    Ok((status_code, body))
}

async fn upload_firmware_native(
    app: &AppHandle,
    request_lock: Arc<Mutex<()>>,
    address: &str,
    port: u16,
    password: &str,
    firmware: Vec<u8>,
) -> Result<String, String> {
    let total = firmware.len();
    if total < 1024 {
        return Err("A feltöltendő firmware túl kicsi vagy sérült.".into());
    }

    let app = app.clone();
    let address = address.to_string();
    let password = password.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = request_lock
            .lock()
            .map_err(|_| "Az Arduino kérési sor zárolása megsérült.".to_string())?;

        emit_ota_progress(
            &app,
            "Kapcsolat",
            "info",
            format!("Beépített OTA TCP-kapcsolat nyitása: {address}:{port}"),
            Some(52),
        );

        let addresses = (address.as_str(), port)
            .to_socket_addrs()
            .map_err(|error| format!("Az OTA-cím nem oldható fel: {error}"))?;
        let mut stream = None;
        let mut last_error = String::new();
        for socket in addresses {
            match TcpStream::connect_timeout(&socket, Duration::from_secs(6)) {
                Ok(value) => {
                    stream = Some(value);
                    break;
                }
                Err(error) => last_error = format!("{socket}: {error}"),
            }
        }
        let mut stream = stream.ok_or_else(|| {
            format!("A Tauri beépített OTA-kliense nem tudott kapcsolódni a(z) {address}:{port} címhez. {last_error}")
        })?;
        stream.set_nodelay(true).ok();
        stream
            .set_read_timeout(Some(Duration::from_secs(240)))
            .map_err(|error| format!("OTA olvasási időkorlát nem állítható be: {error}"))?;
        stream
            .set_write_timeout(Some(Duration::from_secs(240)))
            .map_err(|error| format!("OTA írási időkorlát nem állítható be: {error}"))?;

        emit_ota_progress(
            &app,
            "Kapcsolat",
            "success",
            format!("Közvetlen kapcsolat létrejött: {address}:{port}"),
            Some(54),
        );

        let credentials = BASE64_STANDARD.encode(format!("arduino:{password}"));
        let header = format!(
            "POST /sketch HTTP/1.1\r\n\
Host: {address}:{port}\r\n\
User-Agent: Arduino-LED-Controller-Tauri/3.0.19\r\n\
Authorization: Basic {credentials}\r\n\
Content-Type: application/octet-stream\r\n\
Content-Length: {total}\r\n\
Connection: close\r\n\r\n"
        );
        stream
            .write_all(header.as_bytes())
            .map_err(|error| format!("Az OTA HTTP-fejléc nem küldhető el: {error}"))?;

        const CHUNK_SIZE: usize = 4096;
        let mut offset = 0usize;
        let mut last_reported = 0u8;
        while offset < firmware.len() {
            let end = (offset + CHUNK_SIZE).min(firmware.len());
            stream
                .write_all(&firmware[offset..end])
                .map_err(|error| format!("A firmware küldése megszakadt {offset}/{total} bájtnál: {error}"))?;
            offset = end;
            let percent = ((offset * 100) / total).min(100) as u8;
            if percent >= last_reported.saturating_add(5) || offset == total {
                last_reported = percent;
                let mapped = 55_u8.saturating_add(((percent as u16 * 33) / 100) as u8).min(88);
                emit_ota_progress(
                    &app,
                    "Feltöltés",
                    "output",
                    format!("Firmware küldése az Arduino felé: {percent}% ({offset}/{total} bájt)"),
                    Some(mapped),
                );
            }
        }
        stream
            .flush()
            .map_err(|error| format!("A firmware-küldés lezárása sikertelen: {error}"))?;

        emit_ota_progress(
            &app,
            "Feltöltés",
            "info",
            "A teljes bináris elküldve; várakozás az Arduino HTTP-válaszára…",
            Some(89),
        );

        let mut response = Vec::with_capacity(512);
        let mut buffer = [0u8; 512];
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(length) => {
                    response.extend_from_slice(&buffer[..length]);
                    if response.len() > 8192 {
                        return Err("Az Arduino OTA-válasza váratlanul túl nagy.".into());
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
                        return Err(format!("Az Arduino nem küldött OTA HTTP-választ: {error}"));
                    }
                    break;
                }
                Err(error) => return Err(format!("Az Arduino OTA-válasza nem olvasható: {error}")),
            }
        }
        if response.is_empty() {
            return Err("Az Arduino üres OTA-választ adott.".into());
        }

        let (status_code, response_text) = parse_ota_http_response(&response)?;
        if status_code != 200 {
            let explanation = match status_code {
                401 => "Az OTA-jelszó hibás.",
                404 => "Az Arduino OTA /sketch végpontja nem található.",
                413 => "A firmware nagyobb, mint az Arduino OTA-tárhelye.",
                414 => "A firmware mérete nem egyezik a Content-Length értékével.",
                500 => "Az Arduino nem tudta megnyitni az ideiglenes firmware-tárhelyet.",
                _ => "Az Arduino elutasította az OTA-feltöltést.",
            };
            return Err(format!(
                "{explanation} HTTP {status_code} {}",
                if response_text.is_empty() { "" } else { response_text.as_str() }
            )
            .trim()
            .to_string());
        }

        emit_ota_progress(
            &app,
            "Feltöltés",
            "success",
            format!(
                "Az Arduino elfogadta a teljes firmware-t ({total} bájt). Válasz: {}",
                if response_text.is_empty() { "HTTP 200 OK" } else { response_text.as_str() }
            ),
            Some(91),
        );
        Ok(response_text)
    })
    .await
    .map_err(|error| format!("A beépített OTA háttérfeladat megszakadt: {error}"))?
}

async fn confirm_restart(
    app: &AppHandle,
    state: &AppState,
    expected: Option<String>,
) -> Result<Option<String>, String> {
    const CONFIRM_TIMEOUT: Duration = Duration::from_secs(180);
    const POLL_INTERVAL: Duration = Duration::from_secs(3);

    let started = Instant::now();
    let mut attempt: u32 = 0;
    let mut last_seen_version: Option<String> = None;
    let mut last_error: Option<String> = None;

    emit_ota_progress(
        app,
        "Újraindítás",
        "info",
        "Az Arduino alkalmazza a firmware-t. Legfeljebb 3 percig, 3 másodpercenként ellenőrzöm az életjelet és a telepített verziót…",
        Some(92),
    );

    while started.elapsed() < CONFIRM_TIMEOUT {
        tokio::time::sleep(POLL_INTERVAL).await;
        attempt += 1;

        let elapsed = started.elapsed().as_secs().min(CONFIRM_TIMEOUT.as_secs());
        let progress = 92_u8
            .saturating_add(((elapsed * 7) / CONFIRM_TIMEOUT.as_secs()) as u8)
            .min(99);

        emit_ota_progress(
            app,
            "Újraindítás",
            "info",
            format!(
                "Arduino életjel ellenőrzése: {}. próba • eltelt {} / {} másodperc…",
                attempt,
                elapsed,
                CONFIRM_TIMEOUT.as_secs()
            ),
            Some(progress),
        );

        match get_json(state, "/api/status").await {
            Ok(status) => {
                last_error = None;
                let installed = status
                    .get("firmwareVersion")
                    .and_then(Value::as_str)
                    .map(str::to_string);

                match (&expected, &installed) {
                    (Some(wanted), Some(actual))
                        if normalize_version(wanted) == normalize_version(actual) =>
                    {
                        emit_ota_progress(
                            app,
                            "Ellenőrzés",
                            "success",
                            format!(
                                "Az Arduino visszatért és a várt firmware fut: {actual}. OTA sikeres."
                            ),
                            Some(100),
                        );
                        return Ok(installed.clone());
                    }
                    (None, Some(actual)) => {
                        emit_ota_progress(
                            app,
                            "Ellenőrzés",
                            "success",
                            format!("Az Arduino visszatért, telepített firmware: {actual}."),
                            Some(100),
                        );
                        return Ok(installed.clone());
                    }
                    (Some(wanted), Some(actual)) => {
                        last_seen_version = Some(actual.clone());
                        emit_ota_progress(
                            app,
                            "Ellenőrzés",
                            "info",
                            format!(
                                "Életjel érkezett, de az Arduino még {actual} verziót jelent; várt verzió: {wanted}. Folytatom az ellenőrzést."
                            ),
                            Some(progress),
                        );
                    }
                    _ => {
                        emit_ota_progress(
                            app,
                            "Ellenőrzés",
                            "info",
                            "Az Arduino válaszol, de a firmware-verzió még nem olvasható. Folytatom az ellenőrzést.",
                            Some(progress),
                        );
                    }
                }
            }
            Err(error) => {
                last_error = Some(error.clone());
                emit_ota_progress(
                    app,
                    "Újraindítás",
                    "info",
                    format!(
                        "Az Arduino még nem elérhető ({elapsed} / {} mp). Ez a flash és az újraindítás alatt normális. Részlet: {error}",
                        CONFIRM_TIMEOUT.as_secs()
                    ),
                    Some(progress),
                );
            }
        }
    }

    let expected_text = expected.unwrap_or_else(|| "ismeretlen".into());
    let last_seen_text = last_seen_version.unwrap_or_else(|| "nem érkezett verzió".into());
    let last_error_text = last_error.unwrap_or_else(|| "nem érkezett további hálózati hiba".into());
    Err(format!(
        "Az OTA ellenőrzési idő lejárt: az Arduino 3 percen belül nem igazolta a(z) {expected_text} firmware-t. Utoljára látott verzió: {last_seen_text}. Utolsó kapcsolati állapot: {last_error_text}."
    ))
}

#[tauri::command]
fn runtime_capabilities() -> RuntimeCapabilities {
    let mobile = cfg!(any(target_os = "android", target_os = "ios"));
    let platform = if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    };
    RuntimeCapabilities { platform: platform.into(), mobile, ota_supported: !mobile }
}

#[tauri::command] fn load_config(state: State<AppState>) -> Result<Config, String> { Ok(state.config.lock().map_err(|_| "Beállítás zárolva".to_string())?.clone()) }
#[tauri::command] fn save_config(app: AppHandle, state: State<AppState>, config: Config) -> Result<(), String> {
    validate_config(&config)?;
    fs::write(config_path(&app)?, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    *state.config.lock().map_err(|_| "Beállítás zárolva".to_string())? = config;
    if let Ok(mut cached) = state.last_known_local_ip.lock() { *cached = None; }
    Ok(())
}
#[tauri::command]
fn save_ota_password(app: AppHandle, password: String) -> Result<(), String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err("Mobilplatformon az OTA-jelszó mentése és a firmware-frissítés le van tiltva.".into());
    }
    write_ota_password(&app, &password)
}
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

    if cfg!(any(target_os = "android", target_os = "ios")) {
        status.state = "unsupported".into();
        status.message = "Mobilalkalmazásból firmware-frissítés nem indítható. Használj Windows, macOS vagy Linux gépet.".into();
        status.ota_tool_installed = false;
        status.ota_tool_error = Some("OTA mobilplatformon letiltva".into());
        return Ok(status);
    }

    let terminal_mode = use_terminal_ota(&app, &config).unwrap_or(false);

    if let Ok(value) = get_json(&state, "/api/status").await {
        status.arduino_online = true;
        status.installed_version = value
            .get("firmwareVersion")
            .and_then(Value::as_str)
            .map(str::to_string);
        if let Ok((address, port)) = ota_target_from_status(&config, &value, terminal_mode) {
            status.ota_target_address = Some(address);
            status.ota_target_port = Some(port);
        }
    }

    match use_terminal_ota(&app, &config) {
        Ok(true) => {
            let tool = find_ota_tool(&app, &config);
            status.ota_tool_installed = tool.is_some();
            status.ota_tool_path = tool.map(|path| format!("macOS Terminal + {}", path.to_string_lossy()));
            status.ota_tool_error = None;
        }
        Ok(false) => {
            status.ota_tool_installed = true;
            status.ota_tool_path = Some("Beépített Tauri/Rust HTTP OTA-motor".into());
            status.ota_tool_error = None;
        }
        Err(error) => {
            status.ota_tool_installed = false;
            status.ota_tool_path = None;
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
    emit_ota_progress(app, "Indítás", "info", "Önálló Tauri OTA-frissítés előkészítése…", Some(1));

    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let password = read_ota_password(app)?;
    if password.is_empty() {
        return Err("Hiányzik az OTA-jelszó.".into());
    }
    emit_ota_progress(app, "Előkészítés", "success", "OTA-jelszó betöltve.", Some(3));
    let terminal_mode = use_terminal_ota(app, &config)?;
    let ota_engine_label = if terminal_mode {
        let tool = find_ota_tool(app, &config).ok_or("A Terminal OTA módhoz nem található arduinoOTA.")?;
        format!("macOS Terminal + arduinoOTA ({})", tool.to_string_lossy())
    } else {
        "Beépített Tauri/Rust HTTP OTA-motor".to_string()
    };
    emit_ota_progress(
        app,
        "Előkészítés",
        "success",
        format!("OTA-motor: {ota_engine_label}. Terminal módban az OTA-célt az Arduino aktuális státuszából olvasom ki."),
        Some(5),
    );

    emit_ota_progress(app, "GitHub", "info", "Legfrissebb firmware-kiadás lekérdezése…", Some(7));
    let artifact = latest_firmware(&config).await?;
    let available = artifact
        .firmware_version
        .as_deref()
        .unwrap_or(&artifact.tag)
        .to_string();
    emit_ota_progress(
        app,
        "GitHub",
        "success",
        format!("Elérhető firmware: {available} ({})", artifact.name),
        Some(10),
    );

    emit_ota_progress(app, "Arduino", "info", "Arduino státuszának és OTA-céljának ellenőrzése…", Some(12));
    let status_json = get_json(state, "/api/status")
        .await
        .map_err(|error| format!("OTA indítás előtt nem olvasható az Arduino státusza: {error}"))?;
    let installed = status_json
        .get("firmwareVersion")
        .and_then(Value::as_str)
        .map(str::to_string);
    if installed.as_deref().map(normalize_version) == Some(normalize_version(&available)) {
        return Err(format!(
            "Nincs szükség frissítésre. A telepített és az elérhető firmware-verzió egyaránt {}.",
            installed.unwrap_or(available)
        ));
    }

    let (ota_address, ota_port) = ota_target_from_status(&config, &status_json, terminal_mode)?;
    emit_ota_progress(
        app,
        "Arduino",
        "success",
        format!(
            "Arduino elérhető. Telepített: {} • aktuális OTA cél az Arduino státuszából: {}:{}",
            installed.clone().unwrap_or_else(|| "ismeretlen".into()),
            ota_address,
            ota_port
        ),
        Some(15),
    );
    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "downloading".into();
        current.phase = Some("Letöltés".into());
        current.progress = Some(15);
        current.message = "Firmware letöltése…".into();
        current.available_firmware = Some(artifact.clone());
        current.ota_target_address = Some(ota_address.clone());
        current.ota_target_port = Some(ota_port);
        current.ota_tool_installed = true;
        current.ota_tool_path = Some(ota_engine_label.clone());
        current.ota_tool_error = None;
    }

    let download_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|error| format!("A firmware-letöltő kliens nem hozható létre: {error}"))?;

    emit_ota_progress(
        app,
        "Letöltés",
        "info",
        format!("Firmware letöltése: {}", artifact.download_url),
        Some(18),
    );
    let firmware = download_client
        .get(&artifact.download_url)
        .header("User-Agent", "arduino-led-controller-tauri/3.0.19")
        .send()
        .await
        .map_err(|error| format!("Firmware letöltési hiba: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Firmware letöltési HTTP-hiba: {error}"))?
        .bytes()
        .await
        .map_err(|error| format!("Firmware olvasási hiba: {error}"))?;
    if firmware.len() < 1024 {
        return Err("A firmware túl kicsi vagy sérült.".into());
    }
    emit_ota_progress(
        app,
        "Letöltés",
        "success",
        format!("Firmware letöltve: {} bájt.", firmware.len()),
        Some(30),
    );

    emit_ota_progress(app, "Ellenőrzés", "info", "SHA-256 ellenőrzőösszeg letöltése…", Some(33));
    let checksum_text = download_client
        .get(&artifact.checksum_url)
        .header("User-Agent", "arduino-led-controller-tauri/3.0.19")
        .send()
        .await
        .map_err(|error| format!("Checksum letöltési hiba: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Checksum HTTP-hiba: {error}"))?
        .text()
        .await
        .map_err(|error| format!("Checksum olvasási hiba: {error}"))?;
    let expected = checksum_text
        .split_whitespace()
        .next()
        .ok_or("Üres checksum fájl")?
        .to_lowercase();
    let actual = hex::encode(Sha256::digest(&firmware));
    if expected.len() != 64 || expected != actual {
        return Err(format!(
            "A firmware SHA-256 ellenőrzése sikertelen. Várt: {expected}, kapott: {actual}."
        ));
    }
    emit_ota_progress(
        app,
        "Ellenőrzés",
        "success",
        format!("SHA-256 rendben: {actual}"),
        Some(42),
    );

    let local_filename = safe_firmware_filename(&artifact.name);
    let binary_path = firmware_dir(app)?.join(&local_filename);
    fs::write(&binary_path, &firmware)
        .map_err(|error| format!("A firmware nem menthető ideiglenesen: {error}"))?;
    let persisted_firmware = fs::read(&binary_path)
        .map_err(|error| format!("A helyben mentett firmware nem olvasható vissza: {error}"))?;
    let persisted_hash = hex::encode(Sha256::digest(&persisted_firmware));
    if persisted_firmware.len() != firmware.len() || persisted_hash != actual {
        return Err(format!(
            "A helyben mentett firmware eltér a letöltött GitHub-fájltól. Letöltött: {} bájt / {}, helyi: {} bájt / {}.",
            firmware.len(), actual, persisted_firmware.len(), persisted_hash
        ));
    }
    emit_ota_progress(
        app,
        "Előkészítés",
        "success",
        format!(
            "A GitHub-fájl eredeti neve megőrizve: {} • helyi útvonal: {} • SHA-256 egyezik: {}",
            artifact.name,
            binary_path.to_string_lossy(),
            actual
        ),
        Some(46),
    );

    // A 4.1.15 firmware /api/ota/restart végpontja ArduinoOTA.end() után
    // próbálta ugyanazt a WiFiS3 szervert újranyitni. Ez egyes futásokban zárt
    // portot hagyott maga után. Terminal módban ezért nem zárjuk le a már futó
    // listenert. Újabb firmware-nél a /api/ota/prepare csak tehermentesít.
    emit_ota_progress(
        app,
        "Arduino",
        "info",
        "OTA-listener előkészítése a feltöltés előtt…",
        Some(48),
    );

    let firmware_feature = status_json
        .get("firmwareFeature")
        .and_then(Value::as_str)
        .unwrap_or("");

    let installed_normalized = installed.as_deref().map(normalize_version);
    if firmware_feature == "ota-diagnostics"
        && installed_normalized.as_deref() == Some("4.1.15")
    {
        emit_ota_progress(
            app,
            "Arduino",
            "info",
            "A 4.1.15 ismert restart-listener hibája miatt az API-s újraindítást kihagyom. A Terminal közvetlenül ellenőrzi a már futó OTA-portot.",
            Some(50),
        );
    } else {
        let mut prepared = false;
        for endpoint in ["/api/ota/prepare", "/api/ota/restart"] {
            match get_json(state, endpoint).await {
                Ok(value) if value.get("success").and_then(Value::as_bool) == Some(true) => {
                    emit_ota_progress(
                        app,
                        "Arduino",
                        "success",
                        format!("OTA-listener előkészítve ezen a végponton: {endpoint}"),
                        Some(50),
                    );
                    prepared = true;
                    break;
                }
                Ok(value) => emit_ota_progress(
                    app,
                    "Arduino",
                    "info",
                    format!("Az {endpoint} nem igazolta az előkészítést: {value}"),
                    Some(49),
                ),
                Err(error) => emit_ota_progress(
                    app,
                    "Arduino",
                    "info",
                    format!("Az {endpoint} nem érhető el: {error}"),
                    Some(49),
                ),
            }
        }
        if prepared {
            tokio::time::sleep(Duration::from_millis(1200)).await;
        }
    }


    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "uploading".into();
        current.phase = Some("Feltöltés".into());
        current.progress = Some(52);
        current.message = format!("OTA feltöltés: {}:{} • {}…", ota_address, ota_port, ota_engine_label);
    }

    emit_ota_progress(
        app,
        "Feltöltés",
        "info",
        if terminal_mode {
            format!(
                "A Tauri macOS Terminal ablakban indítja az arduinoOTA feltöltőt: {}:{} • {} bájt",
                ota_address, ota_port, firmware.len()
            )
        } else {
            format!(
                "A Tauri beépített kliense küldi a binárist: POST http://{}:{}/sketch • {} bájt",
                ota_address, ota_port, firmware.len()
            )
        },
        Some(52),
    );

    state.ota_in_progress.store(true, Ordering::SeqCst);
    let upload_result = if terminal_mode {
        upload_firmware_in_terminal(
            app,
            &config,
            &ota_address,
            ota_port,
            &password,
            &binary_path,
        )
        .await
        .map(|_| "Terminal + arduinoOTA".to_string())
    } else {
        upload_firmware_native(
            app,
            Arc::clone(&state.arduino_request_lock),
            &ota_address,
            ota_port,
            &password,
            firmware.to_vec(),
        )
        .await
    };
    upload_result?;

    {
        let mut current = state
            .firmware_status
            .lock()
            .map_err(|_| "Firmware állapot zárolva".to_string())?;
        current.state = "restarting".into();
        current.phase = Some("Újraindítás".into());
        current.progress = Some(92);
        current.message = "Az Arduino alkalmazza a firmware-t és újraindul…".into();
    }
    emit_ota_progress(
        app,
        "Újraindítás",
        "info",
        "A teljes bináris átadva. Várakozás az Arduino újraindulására és az új verzió visszajelzésére…",
        Some(92),
    );

    let installed_after_restart = confirm_restart(app, state, artifact.firmware_version.clone()).await?;
    state.ota_in_progress.store(false, Ordering::SeqCst);
    let final_status = FirmwareStatus {
        state: "success".into(),
        message: format!(
            "Firmware sikeresen telepítve a(z) {} használatával: {}",
            ota_engine_label,
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
        ota_tool_path: Some(ota_engine_label),
        ota_tool_error: None,
        ota_target_address: Some(ota_address),
        ota_target_port: Some(ota_port),
        update_available: false,
        progress: Some(100),
        phase: Some("Kész".into()),
    };
    *state
        .firmware_status
        .lock()
        .map_err(|_| "Firmware állapot zárolva".to_string())? = final_status.clone();
    Ok(final_status)
}

#[tauri::command]
async fn firmware_update(app: AppHandle, state: State<'_, AppState>) -> Result<FirmwareStatus, String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err("Mobilalkalmazásból firmware-frissítés nem indítható. Használj Windows, macOS vagy Linux gépet.".into());
    }
    match firmware_update_inner(&app, &state).await {
        Ok(status) => Ok(status),
        Err(error) => {
            state.ota_in_progress.store(false, Ordering::SeqCst);
            emit_ota_progress(&app, "Hiba", "error", error.clone(), None);
            if let Ok(mut current) = state.firmware_status.lock() {
                current.state = "error".into();
                current.phase = Some("Hiba".into());
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
    fn native_ota_http_response_is_parsed() {
        let response = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK";
        let (status, body) = parse_ota_http_response(response).expect("érvényes OTA-válasz");
        assert_eq!(status, 200);
        assert_eq!(body, "OK");
    }

    #[test]
    fn native_ota_auth_header_matches_arduino_library() {
        use base64::Engine as _;
        let value = BASE64_STANDARD.encode("arduino:password");
        assert_eq!(value, "YXJkdWlubzpwYXNzd29yZA==");
    }

    #[test]
    fn terminal_ota_uses_current_status_ip() {
        let config = Config {
            arduino_ip: "lexyguruhome.ddns.net".into(),
            arduino_port: 25666,
            ota_address: "lexyguruhome.ddns.net".into(),
            ota_port: 25667,
            ..Config::default()
        };
        let status = serde_json::json!({
            "ipAddress": "10.0.0.123",
            "otaPort": 65280,
            "otaEnabled": true
        });
        assert_eq!(
            ota_target_from_status(&config, &status, true).expect("Terminal OTA cél"),
            ("10.0.0.123".to_string(), 65280)
        );
    }

    #[test]
    fn native_ota_can_use_configured_address() {
        let config = Config {
            ota_address: "lexyguruhome.ddns.net".into(),
            ota_port: 25667,
            ..Config::default()
        };
        let status = serde_json::json!({
            "ipAddress": "10.0.0.123",
            "otaPort": 65280,
            "otaEnabled": true
        });
        assert_eq!(
            ota_target_from_status(&config, &status, false).expect("Natív OTA cél"),
            ("lexyguruhome.ddns.net".to_string(), 25667)
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
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
        .invoke_handler(tauri::generate_handler![
            runtime_capabilities,
            load_config,
            save_config,
            save_ota_password,
            arduino_status,
            arduino_logs,
            network_logs,
            set_led,
            load_schedules,
            import_schedules_file,
            export_schedules_file,
            load_schedules_from_arduino,
            save_and_sync_schedules,
            firmware_status,
            firmware_update,
            credential_bridge::credential_status,
            credential_bridge::credential_get,
            credential_bridge::credential_set,
            credential_bridge::credential_delete
        ])
        .run(tauri::generate_context!())
        .expect("Tauri application error");
}
