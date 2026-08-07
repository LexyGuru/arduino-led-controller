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

const ARDUINO_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const ARDUINO_RESPONSE_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Config {
    profile_name: String,
    language: String,
    protocol: String,
    arduino_ip: String,
    arduino_port: u16,
    local_protocol: String,
    local_arduino_ip: String,
    local_arduino_port: u16,
    prefer_local: bool,
    #[serde(default)]
    macos_local_api_enabled: bool,
    ota_use_api_host: bool,
    ota_address: String,
    ota_port: u16,
    ota_upload_mode: String,
    ota_tool_path: String,
    ota_timeout_seconds: u64,
    arduino_api_path: String,
    #[serde(skip_serializing, default)]
    arduino_api_key: String,
    update_channel: String,
    firmware_update_channel: String,
    auto_check_updates: bool,
    auto_download_updates: bool,
    firmware_update_checks: bool,
    timezone_id: String,
    timezone_auto: bool,
    current_utc_offset_minutes: i16,
    next_transition_epoch: u64,
    next_utc_offset_minutes: i16,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            profile_name: "Arduino vezérlő".into(),
            language: "hu".into(),
            protocol: "https".into(),
            arduino_ip: String::new(),
            arduino_port: 443,
            local_protocol: "http".into(),
            local_arduino_ip: String::new(),
            local_arduino_port: 80,
            prefer_local: false,
            macos_local_api_enabled: false,
            ota_use_api_host: true,
            ota_address: String::new(),
            ota_port: 65280,
            ota_upload_mode: "auto".into(),
            ota_tool_path: "/usr/local/bin/arduinoOTA".into(),
            ota_timeout_seconds: 120,
            arduino_api_path: String::new(),
            arduino_api_key: String::new(),
            update_channel: "beta".into(),
            firmware_update_channel: "beta".into(),
            auto_check_updates: true,
            auto_download_updates: false,
            firmware_update_checks: true,
            timezone_id: "Europe/Vienna".into(),
            timezone_auto: true,
            current_utc_offset_minutes: 60,
            next_transition_epoch: 0,
            next_utc_offset_minutes: 60,
        }
    }
}

fn config_runtime_value(config: &Config) -> Result<Value, String> {
    let mut value = serde_json::to_value(config).map_err(|error| error.to_string())?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| "A futásidejű kapcsolatbeállítás nem JSON-objektum.".to_string())?;
    object.insert(
        "arduinoApiKeyConfigured".to_string(),
        Value::Bool(!config.arduino_api_key.trim().is_empty()),
    );
    Ok(value)
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

fn default_schedule_speed() -> u8 {
    50
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleFile {
    format: String,
    version: u8,
    exported_at: String,
    schedules: Vec<Schedule>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleSyncSnapshot {
    schedules: Vec<Schedule>,
    count: u8,
    revision: u64,
    checksum: String,
    empty_action_count: usize,
    recovered_legacy_action_count: usize,
}

#[derive(Debug)]
struct DecodedSchedulePayload {
    schedule: Schedule,
    recovered_legacy_action_count: usize,
}

fn normalize_schedules(mut schedules: Vec<Schedule>) -> Result<Vec<Schedule>, String> {
    for (index, schedule) in schedules.iter_mut().enumerate() {
        if schedule.id.trim().is_empty() {
            schedule.id = format!(
                "imported-{}-{}-{}",
                schedule.day,
                schedule.time.replace(':', ""),
                index
            );
        }
        for led in &mut schedule.leds {
            if led.speed == 0 {
                led.speed = 50;
            }
        }
    }
    schedules.sort_by(|a, b| a.day.cmp(&b.day).then(a.time.cmp(&b.time)));
    validate_schedules(&schedules)?;
    Ok(schedules)
}

fn parse_schedules_json(bytes: &[u8]) -> Result<Vec<Schedule>, String> {
    let value: Value =
        serde_json::from_slice(bytes).map_err(|e| format!("Hibás JSON-fájl: {e}"))?;
    let schedules_value = if value.is_array() {
        value
    } else {
        value
            .get("schedules")
            .cloned()
            .ok_or_else(|| "A JSON nem tartalmaz schedules listát.".to_string())?
    };
    let schedules: Vec<Schedule> = serde_json::from_value(schedules_value)
        .map_err(|e| format!("Hibás időzítés-formátum: {e}"))?;
    normalize_schedules(schedules)
}

fn schedule_file_bytes(schedules: Vec<Schedule>) -> Result<Vec<u8>, String> {
    let schedules = normalize_schedules(schedules)?;
    let exported_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();
    let wrapper = ScheduleFile {
        format: "arduino-led-controller-schedules".into(),
        version: 1,
        exported_at,
        schedules,
    };
    serde_json::to_vec_pretty(&wrapper).map_err(|e| e.to_string())
}

fn write_schedule_cache(app: &AppHandle, schedules: Vec<Schedule>) -> Result<(), String> {
    let path = schedules_path(app)?;
    let temporary = path.with_extension("json.new");
    let bytes = schedule_file_bytes(schedules)?;

    fs::write(&temporary, bytes)
        .map_err(|e| format!("Az ellenőrzött időzítés-cache nem írható: {e}"))?;

    if cfg!(windows) && path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("A régi időzítés-cache nem cserélhető le: {e}"))?;
    }

    fs::rename(&temporary, &path).map_err(|e| {
        let _ = fs::remove_file(&temporary);
        format!("Az ellenőrzött időzítés-cache nem aktiválható: {e}")
    })
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
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    channel: String,
    #[serde(default)]
    expected_firmware_version: Option<String>,
    #[serde(default)]
    metadata_conflict: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AppUpdateArtifact {
    version: String,
    tag: String,
    release_url: Option<String>,
    asset_name: Option<String>,
    download_url: Option<String>,
    created_at: Option<String>,
    channel: String,
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
    ota_configured: bool,
    ota_missing_requirements: Vec<String>,
    backup_store_configured: bool,
    available_firmware: Option<FirmwareArtifact>,
    firmware_lookup_error: Option<String>,
    ota_tool_path: Option<String>,
    ota_tool_error: Option<String>,
    ota_target_address: Option<String>,
    ota_target_port: Option<u16>,
    update_available: bool,
    progress: Option<u8>,
    phase: Option<String>,
    update_channel: String,
    firmware_update_channel: String,
    app_current_version: String,
    available_app: Option<AppUpdateArtifact>,
    app_update_available: bool,
    compatibility_status: Option<String>,
    cache_path: Option<String>,
    cache_sha256: Option<String>,
    boot_id_before: Option<String>,
    boot_id_after: Option<String>,
    schedule_revision_before: Option<u64>,
    schedule_revision_after: Option<u64>,
    schedule_checksum_before: Option<String>,
    schedule_checksum_after: Option<String>,
    cancelled: bool,
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
    ota_cancel_requested: Arc<AtomicBool>,
    // A státuszválaszból megtanult belső IP-cím, csak az aktuális futásra.
    last_known_local_ip: Mutex<Option<String>>,
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let p = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p)
}
fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("connection.json"))
}
fn schedules_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("weekly-led-schedules.json"))
}
fn secret_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("ota-secret.txt"))
}
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
    if host.is_empty() {
        return Ok(());
    }
    if host.contains("://") || host.contains('/') || host.contains(' ') || host.len() > 253 {
        return Err(format!(
            "A(z) {label} mezőben csak IP-címet vagy DDNS-nevet adj meg, protokoll nélkül."
        ));
    }
    Ok(())
}

fn validate_protocol(value: &str, label: &str) -> Result<(), String> {
    if matches!(value.trim().to_ascii_lowercase().as_str(), "http" | "https") {
        Ok(())
    } else {
        Err(format!(
            "Érvénytelen {label}: csak http vagy https használható."
        ))
    }
}

fn validate_config(c: &Config) -> Result<(), String> {
    validate_protocol(&c.protocol, "távoli protokoll")?;
    validate_protocol(&c.local_protocol, "helyi protokoll")?;
    let remote = c.arduino_ip.trim();
    let local = c.local_arduino_ip.trim();
    if remote.is_empty() && local.is_empty() {
        return Err("Legalább a helyi vagy a távoli Arduino-címet add meg.".into());
    }
    validate_host(remote, "távoli Arduino-cím")?;
    validate_host(local, "helyi Arduino-cím")?;
    if !cfg!(any(target_os = "android", target_os = "ios")) {
        validate_host(c.ota_address.trim(), "OTA DDNS/IP-cím")?;
    }
    if !remote.is_empty() && c.arduino_port == 0 {
        return Err("Érvénytelen távoli HTTP-port.".into());
    }
    if !local.is_empty() && c.local_arduino_port == 0 {
        return Err("Érvénytelen helyi HTTP-port.".into());
    }
    if !cfg!(any(target_os = "android", target_os = "ios")) && c.ota_port == 0 {
        return Err("Érvénytelen OTA feltöltési port.".into());
    }
    if !matches!(c.protocol.as_str(), "http" | "https") {
        return Err("A protokoll csak http vagy https lehet.".into());
    }
    if !cfg!(any(target_os = "android", target_os = "ios")) {
        if !matches!(
            c.ota_upload_mode.as_str(),
            "auto" | "system" | "bundled" | "custom"
        ) {
            return Err(
                "Az OTA feltöltési mód csak auto, system, bundled vagy custom lehet.".into(),
            );
        }
        if c.ota_timeout_seconds < 30 || c.ota_timeout_seconds > 600 {
            return Err("Az OTA timeout 30 és 600 másodperc közötti lehet.".into());
        }
    }
    if !matches!(c.update_channel.as_str(), "stable" | "beta") {
        return Err("Az alkalmazás frissítési csatornája csak stable vagy beta lehet.".into());
    }
    if !matches!(c.firmware_update_channel.as_str(), "stable" | "beta") {
        return Err("A firmware frissítési csatornája csak stable vagy beta lehet.".into());
    }
    Ok(())
}

fn protected_path(c: &Config, path: &str) -> Result<String, String> {
    let prefix = c.arduino_api_path.trim_end_matches('/');
    if prefix.is_empty() {
        return Ok(path.to_string());
    }
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
        return Err(
            "Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként.".into(),
        );
    }
    Ok(value)
}

fn add_log(state: &AppState, endpoint: &str, ok: bool, message: String) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    if let Ok(mut logs) = state.network_logs.lock() {
        // Az ismétlődő sikeres polling ne árassza el a hálózati naplót.
        if ok {
            if let Some(last) = logs.last() {
                if last.ok
                    && last.endpoint == endpoint
                    && last.message == message
                    && timestamp.saturating_sub(last.timestamp) < 30
                {
                    return;
                }
            }
        }
        logs.push(NetworkLog {
            timestamp,
            endpoint: endpoint.into(),
            ok,
            message,
        });
        let excess = logs.len().saturating_sub(200);
        if excess > 0 {
            logs.drain(0..excess);
        }
    }
}

fn is_private_or_local_ipv4(value: &str) -> bool {
    value
        .parse::<Ipv4Addr>()
        .map(|ip| ip.is_private() || ip.is_loopback() || ip.is_link_local())
        .unwrap_or(false)
}

#[derive(Debug, Clone)]
struct HttpTarget {
    protocol: String,
    host: String,
    port: u16,
    label: &'static str,
}

fn push_target(
    targets: &mut Vec<HttpTarget>,
    protocol: &str,
    host: &str,
    port: u16,
    label: &'static str,
) {
    let host = host.trim();
    let protocol = protocol.trim().to_ascii_lowercase();
    if host.is_empty() || port == 0 {
        return;
    }
    if targets.iter().any(|item| {
        item.protocol.eq_ignore_ascii_case(&protocol)
            && item.host.eq_ignore_ascii_case(host)
            && item.port == port
    }) {
        return;
    }
    targets.push(HttpTarget {
        protocol,
        host: host.to_string(),
        port,
        label,
    });
}

fn connection_targets(config: &Config, learned_local_ip: Option<&str>) -> Vec<HttpTarget> {
    let macos_ddns_only = cfg!(target_os = "macos") && !config.macos_local_api_enabled;
    let mut local = Vec::new();
    push_target(
        &mut local,
        &config.local_protocol,
        &config.local_arduino_ip,
        config.local_arduino_port,
        "helyi",
    );
    if let Some(ip) = learned_local_ip {
        push_target(
            &mut local,
            &config.local_protocol,
            ip,
            config.local_arduino_port.max(1),
            "felismert helyi",
        );
    }

    let mut remote = Vec::new();
    push_target(
        &mut remote,
        &config.protocol,
        &config.arduino_ip,
        config.arduino_port,
        "távoli/DDNS",
    );

    if macos_ddns_only {
        return remote;
    }
    if config.prefer_local {
        local.extend(remote);
        local
    } else {
        remote.extend(local);
        remote
    }
}

fn raw_json_once(
    c: &Config,
    method: &str,
    path: &str,
    body: Option<&Value>,
    connect_timeout: Duration,
    response_timeout: Duration,
) -> Result<Value, String> {
    validate_config(c)?;
    let host = c.arduino_ip.trim();
    let request_path = protected_path(c, path)?;
    let device_key = device_key_header_value(c)?;
    let protocol = c.protocol.trim().to_ascii_lowercase();
    let url = format!("{protocol}://{host}:{}{request_path}", c.arduino_port);
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(connect_timeout)
        .timeout(response_timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| format!("Arduino HTTP-kliens hiba: {e}"))?;
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| format!("Érvénytelen HTTP-metódus: {e}"))?;
    let mut request = client
        .request(method, &url)
        .header("Accept", "application/json")
        .header("X-Device-Key", device_key)
        .header("Connection", "close");
    if let Some(payload) = body {
        request = request
            .header("Content-Type", "application/json")
            .json(payload);
    }
    let response = request
        .send()
        .map_err(|e| format!("Nem sikerült kapcsolódni a(z) {url} címhez. {e}"))?;
    let status = response.status();
    let bytes = response
        .bytes()
        .map_err(|e| format!("Arduino válaszolvasási hiba ({url}): {e}"))?;
    if !status.is_success() {
        let preview = String::from_utf8_lossy(&bytes)
            .chars()
            .take(240)
            .collect::<String>();
        return Err(format!(
            "Arduino HTTP-válasz: {} {}. Végpont: {url}. Részlet: {preview}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("HIBA")
        ));
    }
    if bytes.is_empty() {
        return Err(format!(
            "Az Arduino üres HTTP-választ adott. Végpont: {url}"
        ));
    }
    serde_json::from_slice(&bytes).map_err(|error| {
        let preview = String::from_utf8_lossy(&bytes)
            .chars()
            .take(240)
            .collect::<String>();
        format!(
            "Hibás vagy csonka Arduino JSON-válasz: {error}. Végpont: {url}. Részlet: {preview}"
        )
    })
}

fn ota_request_allowed_while_busy(method: &str, path: &str) -> bool {
    method.eq_ignore_ascii_case("GET")
        && matches!(
            path.split('?').next().unwrap_or(path),
            "/api/v1/status" | "/api/v1/ota/status"
        )
}

async fn request_json(
    state: &AppState,
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    if state.ota_in_progress.load(Ordering::SeqCst)
        && !ota_request_allowed_while_busy(method, path)
        && !(method.eq_ignore_ascii_case("POST") && path == "/api/v1/ota/prepare")
    {
        return Err(
            "OTA-frissítés folyamatban; ez az Arduino-kérés átmenetileg zárolva van.".into(),
        );
    }
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let learned_local = state
        .last_known_local_ip
        .lock()
        .ok()
        .and_then(|value| value.clone());
    let targets = connection_targets(&config, learned_local.as_deref());
    if targets.is_empty() {
        return Err("Nincs használható Arduino-cím beállítva.".into());
    }

    let request_path = path.to_string();
    let request_method = method.to_ascii_uppercase();
    let request_method_for_worker = request_method.clone();
    let request_body = body.clone();
    let request_lock = Arc::clone(&state.arduino_request_lock);
    let base_config = config.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let _guard = request_lock
            .lock()
            .map_err(|_| "Az Arduino kérési sor zárolása megsérült.".to_string())?;
        let mut errors = Vec::new();
        for target in targets {
            let mut target_config = base_config.clone();
            target_config.protocol = target.protocol.clone();
            target_config.arduino_ip = target.host.clone();
            target_config.arduino_port = target.port;
            match raw_json_once(
                &target_config,
                &request_method_for_worker,
                &request_path,
                request_body.as_ref(),
                ARDUINO_CONNECT_TIMEOUT,
                ARDUINO_RESPONSE_TIMEOUT,
            ) {
                Ok(value) => {
                    let endpoint = format!(
                        "{}://{}:{}{}",
                        target.protocol, target.host, target.port, request_path
                    );
                    return Ok((value, endpoint, target.label));
                }
                Err(error) => errors.push(format!(
                    "{} {}://{}:{}: {}",
                    target.label, target.protocol, target.host, target.port, error
                )),
            }
        }
        Err(format!(
            "Az Arduino egyik beállított címen sem érhető el. {}",
            errors.join(" | ")
        ))
    })
    .await;

    match result {
        Ok(Ok((value, endpoint, label))) => {
            if path.starts_with("/api/v1/status") {
                if let Some(ip) = value
                    .get("ipAddress")
                    .and_then(Value::as_str)
                    .filter(|ip| is_private_or_local_ipv4(ip))
                {
                    if let Ok(mut cached) = state.last_known_local_ip.lock() {
                        *cached = Some(ip.to_string());
                    }
                }
            }
            add_log(
                state,
                &endpoint,
                true,
                format!("{} sikeres ({label})", request_method),
            );
            Ok(value)
        }
        Ok(Err(error)) => {
            add_log(
                state,
                &format!("Arduino API: {} {}", request_method, path),
                false,
                error.clone(),
            );
            Err(error)
        }
        Err(error) => {
            let message = format!("Arduino háttérfeladat hiba: {error}");
            add_log(
                state,
                &format!("Arduino API: {} {}", request_method, path),
                false,
                message.clone(),
            );
            Err(message)
        }
    }
}

async fn get_json(state: &AppState, path: &str) -> Result<Value, String> {
    request_json(state, "GET", path, None).await
}

async fn post_json(state: &AppState, path: &str, body: Option<Value>) -> Result<Value, String> {
    request_json(state, "POST", path, body).await
}

async fn put_json(state: &AppState, path: &str, body: Value) -> Result<Value, String> {
    request_json(state, "PUT", path, Some(body)).await
}

async fn delete_json(state: &AppState, path: &str) -> Result<Value, String> {
    request_json(state, "DELETE", path, None).await
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
    #[serde(default, alias = "scheduleCount")]
    count: u8,
    #[serde(default)]
    revision: u64,
    #[serde(default)]
    checksum: String,
}

#[derive(Debug, Deserialize)]
struct ArduinoSchedulePage {
    #[serde(default)]
    revision: u64,
    #[serde(default)]
    count: u8,
    #[serde(default)]
    entries: Vec<ArduinoScheduleEntry>,
}

#[derive(Debug, Deserialize)]
struct ArduinoScheduleEntry {
    index: u8,
    payload: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArduinoScheduleTransaction {
    transaction_id: u64,
    total: u8,
}

fn decode_schedule_payload(payload: &str, index: u8) -> Result<DecodedSchedulePayload, String> {
    let bytes = hex::decode(payload).map_err(|error| {
        format!(
            "A(z) {}. Arduino schedule rekord hibás HEX-adatot tartalmaz: {error}",
            index + 1
        )
    })?;
    if bytes.len() != 27 {
        return Err(format!(
            "A(z) {}. Arduino schedule rekord mérete {} bájt, 27 helyett.",
            index + 1,
            bytes.len()
        ));
    }

    let day = bytes[0];
    let hour = bytes[1];
    let minute = bytes[2];
    if !(1..=7).contains(&day) || hour > 23 || minute > 59 {
        return Err(format!(
            "A(z) {}. Arduino schedule rekord érvénytelen napot vagy időpontot tartalmaz: nap={}, idő={hour:02}:{minute:02}.",
            index + 1,
            day
        ));
    }

    let mut leds = Vec::new();
    let mut recovered_legacy_action_count = 0usize;
    for led_index in 0..3usize {
        let at = 3 + led_index * 8;
        let explicit_apply = bytes[at] != 0;
        let has_preserved_payload = bytes[(at + 1)..(at + 8)].iter().any(|value| *value != 0);

        if !explicit_apply && !has_preserved_payload {
            continue;
        }
        if !explicit_apply {
            recovered_legacy_action_count += 1;
        }

        leds.push(ScheduleLed {
            id: (led_index + 1) as u8,
            enabled: bytes[at + 1] != 0,
            brightness: bytes[at + 2],
            effect: bytes[at + 3],
            speed: bytes[at + 4].clamp(1, 100),
            color: vec![bytes[at + 5], bytes[at + 6], bytes[at + 7]],
        });
    }

    Ok(DecodedSchedulePayload {
        schedule: Schedule {
            id: format!("arduino-{index}"),
            day,
            time: format!("{hour:02}:{minute:02}"),
            leds,
        },
        recovered_legacy_action_count,
    })
}

async fn schedule_status(state: &AppState) -> Result<ArduinoScheduleStatus, String> {
    serde_json::from_value(get_json(state, "/api/v1/schedules/status").await?)
        .map_err(|e| format!("Az Arduino schedule státuszválasza hibás: {e}"))
}

async fn fetch_schedule_snapshot(state: &AppState) -> Result<ScheduleSyncSnapshot, String> {
    let status = schedule_status(state).await?;
    let mut all = Vec::with_capacity(status.count as usize);
    let mut recovered_legacy_action_count = 0usize;
    let mut offset = 0u8;

    while offset < status.count {
        let page: ArduinoSchedulePage = serde_json::from_value(
            get_json(state, &format!("/api/v1/schedules?offset={offset}&limit=8")).await?,
        )
        .map_err(|e| format!("A schedule oldal válasza hibás (offset={offset}): {e}"))?;

        if page.revision != status.revision || page.count != status.count {
            return Err(format!(
                "A lapozott schedule-letöltés közben megváltozott az Arduino állapota: revision {}/{}; count {}/{}.",
                status.revision, page.revision, status.count, page.count
            ));
        }
        if page.entries.is_empty() {
            return Err(format!(
                "Üres schedule oldal érkezett a(z) {offset}. offsetnél, miközben az Arduino {} rekordot jelent.",
                status.count
            ));
        }

        for entry in page.entries {
            let expected = all.len() as u8;
            if entry.index != expected {
                return Err(format!(
                    "A schedule oldal sorszáma eltér: várt {expected}, kapott {}.",
                    entry.index
                ));
            }
            let decoded = decode_schedule_payload(&entry.payload, entry.index)?;
            recovered_legacy_action_count += decoded.recovered_legacy_action_count;
            all.push(decoded.schedule);
        }

        let next_offset = all.len() as u8;
        if next_offset <= offset {
            return Err(format!(
                "A schedule-lapozás nem haladt előre a(z) {offset}. offset után."
            ));
        }
        offset = next_offset;
    }

    if all.len() != status.count as usize {
        return Err(format!(
            "Hiányos schedule-letöltés: várt {}, kapott {}.",
            status.count,
            all.len()
        ));
    }

    all.sort_by(|a, b| a.day.cmp(&b.day).then(a.time.cmp(&b.time)));
    let empty_action_count = all
        .iter()
        .filter(|schedule| schedule.leds.is_empty())
        .count();

    Ok(ScheduleSyncSnapshot {
        schedules: all,
        count: status.count,
        revision: status.revision,
        checksum: status.checksum,
        empty_action_count,
        recovered_legacy_action_count,
    })
}

fn validate_schedules(items: &[Schedule]) -> Result<(), String> {
    if items.len() > 60 {
        return Err("Az Arduino legfeljebb 60 időzítést tárolhat.".into());
    }
    for (schedule_index, schedule) in items.iter().enumerate() {
        if !(1..=7).contains(&schedule.day) || schedule.time.len() != 5 {
            return Err(format!(
                "A(z) {}. időzítés napja vagy időformátuma érvénytelen.",
                schedule_index + 1
            ));
        }
        let mut parts = schedule.time.split(':');
        let hour: u8 = parts
            .next()
            .and_then(|value| value.parse().ok())
            .ok_or_else(|| format!("A(z) {}. időzítés órája hibás.", schedule_index + 1))?;
        let minute: u8 = parts
            .next()
            .and_then(|value| value.parse().ok())
            .ok_or_else(|| format!("A(z) {}. időzítés perce hibás.", schedule_index + 1))?;
        if parts.next().is_some() || hour > 23 || minute > 59 {
            return Err(format!(
                "A(z) {}. időzítés időértéke érvénytelen: {}.",
                schedule_index + 1,
                schedule.time
            ));
        }

        let mut seen_leds = 0u8;
        for led in &schedule.leds {
            if !(1..=3).contains(&led.id) {
                return Err(format!(
                    "A(z) {}. időzítés ismeretlen LED-azonosítót tartalmaz: {}.",
                    schedule_index + 1,
                    led.id
                ));
            }
            let mask = 1u8 << (led.id - 1);
            if seen_leds & mask != 0 {
                return Err(format!(
                    "A(z) {}. időzítésben a LED {} többször szerepel.",
                    schedule_index + 1,
                    led.id
                ));
            }
            seen_leds |= mask;

            if led.effect > 4 {
                return Err(format!(
                    "A(z) {}. időzítés LED {} effektje érvénytelen: {}.",
                    schedule_index + 1,
                    led.id,
                    led.effect
                ));
            }
            if !(1..=100).contains(&led.speed) {
                return Err(format!(
                    "A(z) {}. időzítés LED {} sebessége érvénytelen: {}.",
                    schedule_index + 1,
                    led.id,
                    led.speed
                ));
            }
            if led.color.len() != 3 {
                return Err(format!(
                    "A(z) {}. időzítés LED {} színadata nem RGB-hármas.",
                    schedule_index + 1,
                    led.id
                ));
            }
        }
    }
    Ok(())
}

fn encode_schedule(s: &Schedule) -> Result<String, String> {
    let mut parts = s.time.split(':');
    let hour: u8 = parts
        .next()
        .and_then(|v| v.parse().ok())
        .ok_or("Hibás idő")?;
    let minute: u8 = parts
        .next()
        .and_then(|v| v.parse().ok())
        .ok_or("Hibás idő")?;
    let mut bytes = vec![s.day, hour, minute];
    for id in 1..=3u8 {
        if let Some(l) = s.leds.iter().find(|l| l.id == id) {
            bytes.extend_from_slice(&[
                1,
                l.enabled as u8,
                l.brightness,
                l.effect,
                l.speed,
                l.color[0],
                l.color[1],
                l.color[2],
            ]);
        } else {
            bytes.extend_from_slice(&[0; 8]);
        }
    }
    Ok(hex::encode(bytes))
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    published_at: Option<String>,
    html_url: Option<String>,
    #[serde(default)]
    prerelease: bool,
    #[serde(default)]
    draft: bool,
    assets: Vec<GitHubAsset>,
}
#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

const FIRMWARE_REPOSITORY: &str = "LexyGuru/arduino-led-controller";
const FIRMWARE_BETA_RELEASE_TAG: &str = "Arduino_LED_Controller_Firmware_BETA";
const OTA_UPLOAD_PORT: u16 = 65280;

async fn github_releases() -> Result<Vec<GitHubRelease>, String> {
    let url = format!(
        "https://api.github.com/repos/{}/releases?per_page=30",
        FIRMWARE_REPOSITORY
    );
    reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|e| e.to_string())?
        .get(url)
        .header("User-Agent", "arduino-led-controller-tauri")
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("GitHub kapcsolati hiba: {e}"))?
        .error_for_status()
        .map_err(|e| format!("GitHub válaszhiba: {e}"))?
        .json()
        .await
        .map_err(|e| format!("A GitHub release-lista nem értelmezhető: {e}"))
}

fn release_matches_channel(release: &GitHubRelease, channel: &str) -> bool {
    !release.draft
        && if channel == "stable" {
            !release.prerelease
        } else {
            release.prerelease
        }
}

fn version_token_from_text(text: &str) -> Option<String> {
    text.split(|ch: char| !(ch.is_ascii_alphanumeric() || ch == '.' || ch == '-'))
        .map(|token| token.trim_start_matches(['v', 'V']))
        .find(|token| {
            token.chars().next().is_some_and(|ch| ch.is_ascii_digit())
                && token.matches('.').count() >= 2
                && token
                    .chars()
                    .all(|ch| ch.is_ascii_alphanumeric() || ch == '.' || ch == '-')
        })
        .map(str::to_string)
}

fn firmware_version_from_asset_name(name: &str) -> Option<String> {
    let lower = name.to_ascii_lowercase();
    if lower.ends_with(".bin")
        && !lower.ends_with(".bin.sha256")
        && lower.starts_with("arduino_led_controller_firmware_")
        && lower.ends_with("_uno_r4_wifi.bin")
    {
        version_token_from_text(name)
    } else {
        None
    }
}

fn firmware_version_is_prerelease(version: &str) -> bool {
    normalize_version(version).contains("-beta")
}

fn firmware_artifacts_from_release(release: &GitHubRelease) -> Vec<FirmwareArtifact> {
    if release.draft || release.tag_name != FIRMWARE_BETA_RELEASE_TAG {
        return Vec::new();
    }
    release
        .assets
        .iter()
        .filter_map(|binary| {
            let version = firmware_version_from_asset_name(&binary.name)?;
            if !firmware_version_is_prerelease(&version) {
                return None;
            }
            let checksum_name = format!("{}.sha256", binary.name);
            let checksum = release
                .assets
                .iter()
                .find(|asset| asset.name == checksum_name)?;
            Some(FirmwareArtifact {
                name: binary.name.clone(),
                download_url: binary.browser_download_url.clone(),
                checksum_url: checksum.browser_download_url.clone(),
                firmware_version: Some(version.clone()),
                tag: version,
                created_at: release.published_at.clone(),
                summary: Some("Dedikált Arduino LED Controller Beta firmware-katalógus".into()),
                channel: "beta".into(),
                expected_firmware_version: None,
                metadata_conflict: None,
            })
        })
        .collect()
}

fn firmware_version_key(version: &str) -> (u64, u64, u64, u64) {
    let normalized = normalize_version(version);
    let (core, beta) = normalized
        .split_once("-beta.")
        .unwrap_or((&normalized, "0"));
    let mut parts = core.split('.').filter_map(|v| v.parse::<u64>().ok());
    (
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        beta.parse().unwrap_or(0),
    )
}

async fn firmware_beta_release() -> Result<GitHubRelease, String> {
    github_releases()
        .await?
        .into_iter()
        .find(|release| release.tag_name == FIRMWARE_BETA_RELEASE_TAG && !release.draft)
        .ok_or_else(|| {
            format!(
                "A dedikált {} GitHub release nem található.",
                FIRMWARE_BETA_RELEASE_TAG
            )
        })
}

#[tauri::command]
async fn firmware_releases(state: State<'_, AppState>) -> Result<Vec<FirmwareArtifact>, String> {
    let channel = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .firmware_update_channel
        .clone();
    if channel.trim() != "beta" {
        return Ok(Vec::new());
    }
    let release = firmware_beta_release().await?;
    let mut artifacts = firmware_artifacts_from_release(&release);
    artifacts.sort_by_key(|a| {
        std::cmp::Reverse(firmware_version_key(
            a.firmware_version.as_deref().unwrap_or(&a.tag),
        ))
    });
    Ok(artifacts)
}

async fn latest_firmware(config: &Config) -> Result<FirmwareArtifact, String> {
    if config.firmware_update_channel.trim() != "beta" {
        return Err(
            "A stabil dedikált firmware-release még nincs konfigurálva; nincs beta fallback."
                .into(),
        );
    }
    let release = firmware_beta_release().await?;
    firmware_artifacts_from_release(&release)
        .into_iter()
        .max_by_key(|a| firmware_version_key(a.firmware_version.as_deref().unwrap_or(&a.tag)))
        .ok_or_else(|| {
            "A dedikált Beta firmware-release nem tartalmaz teljes BIN + SHA-256 párt.".into()
        })
}
fn app_asset_for_platform(release: &GitHubRelease) -> Option<&GitHubAsset> {
    let names: &[&str] = if cfg!(target_os = "macos") {
        &[".dmg", ".app.tar.gz"]
    } else if cfg!(target_os = "windows") {
        &["setup.exe", ".msi", ".exe"]
    } else if cfg!(target_os = "linux") {
        &[".appimage", ".deb", ".rpm"]
    } else {
        &[]
    };
    release.assets.iter().find(|asset| {
        let lower = asset.name.to_ascii_lowercase();
        names.iter().any(|suffix| lower.ends_with(suffix)) && !lower.contains("firmware")
    })
}

async fn latest_app_release(config: &Config) -> Result<AppUpdateArtifact, String> {
    let releases = github_releases().await?;
    let release = releases
        .iter()
        .find(|release| {
            release_matches_channel(release, config.update_channel.trim())
                && app_asset_for_platform(release).is_some()
        })
        .ok_or_else(|| {
            format!(
                "A(z) {} csatornán nincs ehhez a platformhoz alkalmazáscsomag.",
                config.update_channel
            )
        })?;
    let asset = app_asset_for_platform(release);
    Ok(AppUpdateArtifact {
        version: normalize_version(&release.tag_name),
        tag: release.tag_name.clone(),
        release_url: release.html_url.clone(),
        asset_name: asset.map(|a| a.name.clone()),
        download_url: asset.map(|a| a.browser_download_url.clone()),
        created_at: release.published_at.clone(),
        channel: config.update_channel.clone(),
    })
}

fn ensure_not_cancelled(state: &AppState) -> Result<(), String> {
    if state.ota_cancel_requested.load(Ordering::SeqCst) {
        Err("OTA_CANCELLED: a firmware-frissítést a felhasználó megszakította.".into())
    } else {
        Ok(())
    }
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

fn profile_slug(value: &str) -> String {
    let slug: String = value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
                ch
            } else {
                '-'
            }
        })
        .collect();
    let slug = slug.trim_matches('-');
    if slug.is_empty() {
        "default".into()
    } else {
        slug.chars().take(80).collect()
    }
}

fn profile_account(config: &Config, kind: &str) -> String {
    format!("direct:{}:{}", profile_slug(&config.profile_name), kind)
}

fn read_ota_password(app: &AppHandle) -> Result<String, String> {
    Ok(fs::read_to_string(secret_path(app)?)
        .unwrap_or_default()
        .trim()
        .to_string())
}

async fn read_profile_ota_password(config: &Config) -> Result<String, String> {
    Ok(
        credential_bridge::get_profile_secret(profile_account(config, "ota-password"))
            .await?
            .unwrap_or_default(),
    )
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

fn ota_target_from_status(
    config: &Config,
    status: &Value,
    terminal_mode: bool,
) -> Result<(String, u16), String> {
    // A macOS Terminal külön folyamatként fut, ezért ott mindig az Arduino
    // saját, aktuális LAN-címét használjuk. Ezt minden OTA előtt frissen az
    // /api/v1/status ipAddress és otaPort mezőiből olvassuk ki; nincs beégetett IP.
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
        candidates.push(
            resource_dir
                .join("tools")
                .join("arduinoOTA")
                .join("arduinoOTA"),
        );
        candidates.push(resource_dir.join("arduinoOTA"));
    }

    candidates
        .into_iter()
        .find(|candidate| ota_tool_works(candidate))
}
fn normalized_ota_timeout_seconds(value: u64) -> u64 {
    value.clamp(30, 600)
}
fn use_terminal_ota(_app: &AppHandle, config: &Config) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        if find_ota_tool(_app, config).is_none() {
            return Err(
                "macOS-en az UNO R4 OTA-frissítéshez nem található működő helyi arduinoOTA. Ellenőrzött helyek: az egyedi útvonal, /usr/local/bin/arduinoOTA és /opt/homebrew/bin/arduinoOTA."
                    .into(),
            );
        }
        return Ok(true);
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(matches!(config.ota_upload_mode.trim(), "system" | "custom"))
    }
}
#[cfg(target_os = "macos")]
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
    line[start..percent_at]
        .parse::<u8>()
        .ok()
        .map(|value| value.min(100))
}

#[cfg(target_os = "macos")]
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
    fs::create_dir_all(&work_dir)
        .map_err(|error| format!("Az OTA Terminal munkamappa nem hozható létre: {error}"))?;

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
TIMEOUT_SECONDS={}
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
TOOL_HELP="$("$TOOL" -h 2>&1 || true)"
TOOL_HELP="$TOOL_HELP
$("$TOOL" --help 2>&1 || true)"
if ! print -r -- "$TOOL_HELP" | /usr/bin/grep -E -q -- '(^|[[:space:],])-t([[:space:],=]|$)'; then
  print -r -- "[Tauri OTA] HIBA: a kiválasztott külső arduinoOTA nem támogat igazolható -t timeout kapcsolót. UNO R4 frissítéshez válaszd az auto vagy bundled módot; ezek a beépített Rust OTA-motort használják." | tee -a "$LOG"
  print -r -- "64" > "$EXIT_FILE"
  exit 64
fi
TIMEOUT_ARGS=(-t "$TIMEOUT_SECONDS")
print -r -- "[Tauri OTA] Külső arduinoOTA timeout: $TIMEOUT_SECONDS másodperc." | tee -a "$LOG"
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
        normalized_ota_timeout_seconds(config.ota_timeout_seconds),
    );

    fs::write(&script_path, script.as_bytes())
        .map_err(|error| format!("Az OTA Terminal parancsfájl nem írható: {error}"))?;
    fs::set_permissions(&script_path, fs::Permissions::from_mode(0o700))
        .map_err(|error| format!("Az OTA Terminal parancsfájl nem tehető futtathatóvá: {error}"))?;

    emit_ota_progress(
        &app,
        "Terminal",
        "info",
        format!(
            "macOS Terminal megnyitása: {}",
            script_path.to_string_lossy()
        ),
        Some(53),
    );

    let open_status = Command::new("open")
        .args(["-a", "Terminal"])
        .arg(&script_path)
        .status()
        .map_err(|error| format!("A macOS Terminal nem indítható: {error}"))?;
    if !open_status.success() {
        return Err(format!(
            "A macOS Terminal megnyitása sikertelen: {open_status}"
        ));
    }

    let connection_hint = format!(
        "\n\nA Terminal az Arduino /api/v1/status válaszából kiolvasott aktuális LAN-címet használta: {address}:{port}. Ha a portteszt zárt portot jelez, az nem DNS- vagy firmware-fájlnév-hiba: az Arduino OTA-listenere nem hallgat."
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
                // ezért a következő, legfeljebb 3 perces /api/v1/status ellenőrzés hozza meg.
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
    let body = String::from_utf8_lossy(&response[split + 4..])
        .trim()
        .to_string();
    Ok((status_code, body))
}

async fn upload_firmware_native(
    app: &AppHandle,
    request_lock: Arc<Mutex<()>>,
    address: &str,
    port: u16,
    password: &str,
    firmware: Vec<u8>,
    timeout_seconds: u64,
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
        let ota_timeout =
            Duration::from_secs(normalized_ota_timeout_seconds(timeout_seconds));
        stream
            .set_read_timeout(Some(ota_timeout))
            .map_err(|error| format!("OTA olvasási időkorlát nem állítható be: {error}"))?;
        stream
            .set_write_timeout(Some(ota_timeout))
            .map_err(|error| format!("OTA írási időkorlát nem állítható be: {error}"))?;
        emit_ota_progress(
            &app,
            "Kapcsolat",
            "info",
            format!(
                "Beépített Rust OTA timeout: {} másodperc.",
                ota_timeout.as_secs()
            ),
            Some(53),
        );

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

        match get_json(state, "/api/v1/status").await {
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
    RuntimeCapabilities {
        platform: platform.into(),
        mobile,
        ota_supported: !mobile,
    }
}

#[tauri::command]
fn load_config(state: State<AppState>) -> Result<Value, String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    if cfg!(target_os = "macos") {
        config.prefer_local = false;
        config.ota_use_api_host = false;
    }
    config_runtime_value(&config)
}

#[tauri::command]
async fn migrate_native_credentials(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let mut changed = false;
    if cfg!(any(target_os = "android", target_os = "ios")) {
        fs::write(
            config_path(&app)?,
            serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        *state
            .config
            .lock()
            .map_err(|_| "Beállítás zárolva".to_string())? = config;
        return Ok(false);
    }
    if !config.arduino_api_key.trim().is_empty() {
        credential_bridge::set_profile_secret(
            profile_account(&config, "device-key"),
            config.arduino_api_key.clone(),
        )
        .await?;
        config.arduino_api_key.clear();
        changed = true;
    }
    let legacy_ota = read_ota_password(&app)?;
    if !legacy_ota.is_empty() {
        credential_bridge::set_profile_secret(profile_account(&config, "ota-password"), legacy_ota)
            .await?;
        let _ = fs::remove_file(secret_path(&app)?);
        changed = true;
    }
    if let Some(secret) =
        credential_bridge::get_profile_secret(profile_account(&config, "device-key")).await?
    {
        config.arduino_api_key = secret;
    }
    fs::write(
        config_path(&app)?,
        serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    *state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())? = config;
    Ok(changed)
}

#[tauri::command]
async fn save_config(
    app: AppHandle,
    state: State<'_, AppState>,
    mut config: Config,
) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        config.prefer_local = false;
        config.ota_use_api_host = false;
    }
    validate_config(&config)?;
    if cfg!(any(target_os = "android", target_os = "ios")) {
        fs::write(
            config_path(&app)?,
            serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        *state
            .config
            .lock()
            .map_err(|_| "Beállítás zárolva".to_string())? = config;
        if let Ok(mut cached) = state.last_known_local_ip.lock() {
            *cached = None;
        }
        return Ok(());
    }
    if !config.arduino_api_key.trim().is_empty() {
        credential_bridge::set_profile_secret(
            profile_account(&config, "device-key"),
            config.arduino_api_key.clone(),
        )
        .await?;
    }
    let persisted = config.clone();
    fs::write(
        config_path(&app)?,
        serde_json::to_vec_pretty(&persisted).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    if let Some(secret) =
        credential_bridge::get_profile_secret(profile_account(&config, "device-key")).await?
    {
        config.arduino_api_key = secret;
    }
    *state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())? = config;
    if let Ok(mut cached) = state.last_known_local_ip.lock() {
        *cached = None;
    }
    Ok(())
}

#[tauri::command]
async fn save_ota_password(state: State<'_, AppState>, password: String) -> Result<(), String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err(
            "Mobilplatformon az OTA-jelszó mentése és a firmware-frissítés le van tiltva.".into(),
        );
    }
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    credential_bridge::set_profile_secret(profile_account(&config, "ota-password"), password).await
}
#[tauri::command]
async fn arduino_status(state: State<'_, AppState>) -> Result<Value, String> {
    get_json(&state, "/api/v1/status").await
}
#[tauri::command]
async fn sync_time_config(state: State<'_, AppState>) -> Result<Value, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    put_json(
        &state,
        "/api/v1/time/config",
        serde_json::json!({
            "timezoneId": config.timezone_id,
            "currentUtcOffsetMinutes": config.current_utc_offset_minutes,
            "nextTransitionEpoch": config.next_transition_epoch,
            "nextUtcOffsetMinutes": config.next_utc_offset_minutes
        }),
    )
    .await
}

#[tauri::command]
async fn arduino_logs(state: State<'_, AppState>, after_id: u32) -> Result<Value, String> {
    let value = get_json(&state, &format!("/api/v1/logs?afterId={after_id}")).await?;
    normalize_console_response(value)
}
#[tauri::command]
fn network_logs(state: State<AppState>) -> Result<Vec<NetworkLog>, String> {
    Ok(state
        .network_logs
        .lock()
        .map_err(|_| "Napló zárolva".to_string())?
        .clone())
}
#[tauri::command]
async fn set_led(
    state: State<'_, AppState>,
    id: u8,
    enabled: bool,
    brightness: u8,
    effect: u8,
    speed: u8,
    color: Vec<u8>,
) -> Result<Value, String> {
    if !(1..=3).contains(&id) || color.len() != 3 || effect > 4 || speed == 0 {
        return Err("Érvénytelen LED-beállítás.".into());
    }
    put_json(
        &state,
        &format!("/api/v1/leds/{id}"),
        serde_json::json!({
            "enabled": enabled,
            "brightness": brightness,
            "effect": effect,
            "speed": speed,
            "color": color
        }),
    )
    .await
}
#[tauri::command]
fn load_schedules(app: AppHandle) -> Result<Vec<Schedule>, String> {
    let path = schedules_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
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
    if output
        .extension()
        .and_then(|v| v.to_str())
        .map(|v| !v.eq_ignore_ascii_case("json"))
        .unwrap_or(true)
    {
        output.set_extension("json");
    }
    let bytes = schedule_file_bytes(schedules)?;
    fs::write(&output, bytes).map_err(|e| format!("A JSON-fájl nem menthető: {e}"))
}
#[tauri::command]
async fn load_schedules_from_arduino(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ScheduleSyncSnapshot, String> {
    let snapshot = fetch_schedule_snapshot(&state).await?;
    write_schedule_cache(&app, snapshot.schedules.clone())?;
    Ok(snapshot)
}

#[tauri::command]
async fn save_and_sync_schedules(
    app: AppHandle,
    state: State<'_, AppState>,
    schedules: Vec<Schedule>,
    expected_revision: Option<u64>,
    force: Option<bool>,
) -> Result<Value, String> {
    let schedules = normalize_schedules(schedules)?;
    let before = schedule_status(&state).await?;
    let force = force.unwrap_or(false);

    if !force {
        let expected = match expected_revision {
            Some(expected) => expected,
            None => {
                let synchronized = fetch_schedule_snapshot(&state).await.map_err(|error| {
                    format!(
                        "SCHEDULE_AUTO_SYNC_FAILED: A mentés előtti automatikus Arduino-szinkron sikertelen: {error}"
                    )
                })?;
                write_schedule_cache(&app, synchronized.schedules)?;
                synchronized.revision
            }
        };
        if before.revision != expected {
            return Err(format!(
                "SCHEDULE_CONFLICT: Az Arduino schedule revision közben megváltozott: várt {expected}, aktuális {}.",
                before.revision
            ));
        }
    }

    if schedules.is_empty() {
        delete_json(&state, "/api/v1/schedules").await?;
        let verified = fetch_schedule_snapshot(&state).await?;
        if verified.count != 0 || !verified.schedules.is_empty() {
            return Err(format!(
                "Az Arduino törlés után még {} időzítést jelent.",
                verified.count
            ));
        }
        write_schedule_cache(&app, verified.schedules.clone())?;
        return Ok(serde_json::json!({
            "success": true,
            "schedules": verified.schedules.clone(),
            "count": verified.count,
            "verifiedCount": verified.count,
            "revision": verified.revision,
            "revisionBefore": before.revision,
            "revisionAfter": verified.revision,
            "checksum": verified.checksum.clone(),
            "checksumBefore": before.checksum,
            "checksumAfter": verified.checksum,
            "emptyActionCount": verified.empty_action_count,
            "recoveredLegacyActionCount": verified.recovered_legacy_action_count
        }));
    }

    let transaction: ArduinoScheduleTransaction = serde_json::from_value(
        post_json(
            &state,
            "/api/v1/schedules/transactions",
            Some(serde_json::json!({
                "expectedRevision": before.revision,
                "total": schedules.len()
            })),
        )
        .await?,
    )
    .map_err(|e| format!("A schedule tranzakció indítóválasza hibás: {e}"))?;

    if transaction.total as usize != schedules.len() {
        return Err(format!(
            "A schedule tranzakció elemszáma eltér: várt {}, kapott {}.",
            schedules.len(),
            transaction.total
        ));
    }

    let tx_base = format!(
        "/api/v1/schedules/transactions/{}",
        transaction.transaction_id
    );
    let upload_result: Result<(), String> = async {
        for (index, schedule) in schedules.iter().enumerate() {
            put_json(
                &state,
                &format!("{tx_base}/chunks"),
                serde_json::json!({
                    "index": index,
                    "payload": encode_schedule(schedule)?
                }),
            )
            .await?;
        }
        post_json(&state, &format!("{tx_base}/commit"), None).await?;
        Ok(())
    }
    .await;

    if let Err(error) = upload_result {
        let _ = delete_json(&state, &tx_base).await;
        return Err(format!(
            "A schedule tranzakció megszakadt és vissza lett vonva: {error}"
        ));
    }

    let after = schedule_status(&state).await?;
    if after.count as usize != schedules.len() || after.revision <= before.revision {
        return Err(format!(
            "A schedule commit visszaellenőrzése sikertelen. Count: {} -> {}, revision: {} -> {}.",
            before.count, after.count, before.revision, after.revision
        ));
    }

    let verified = fetch_schedule_snapshot(&state).await?;
    let expected_payloads: Vec<String> = schedules
        .iter()
        .map(encode_schedule)
        .collect::<Result<_, _>>()?;
    let verified_payloads: Vec<String> = verified
        .schedules
        .iter()
        .map(encode_schedule)
        .collect::<Result<_, _>>()?;
    if expected_payloads != verified_payloads {
        return Err(
            "A schedule commit utáni teljes readback eltér a feltöltött tartalomtól.".into(),
        );
    }
    if verified.revision != after.revision
        || verified.count != after.count
        || verified.checksum != after.checksum
    {
        return Err(
            "A schedule commit utáni státusz és teljes readback revision/checksum értéke eltér."
                .into(),
        );
    }

    write_schedule_cache(&app, verified.schedules.clone())?;

    Ok(serde_json::json!({
        "success": true,
        "schedules": verified.schedules.clone(),
        "count": verified.count,
        "verifiedCount": verified.count,
        "revision": verified.revision,
        "revisionBefore": before.revision,
        "revisionAfter": verified.revision,
        "checksum": verified.checksum.clone(),
        "checksumBefore": before.checksum,
        "checksumAfter": verified.checksum,
        "emptyActionCount": verified.empty_action_count,
        "recoveredLegacyActionCount": verified.recovered_legacy_action_count
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleBackup {
    id: String,
    created_at: u64,
    count: usize,
    revision: Option<u64>,
    checksum: String,
    schedules: Vec<Schedule>,
}

fn schedule_backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app_dir(app)?.join("schedule-backups");
    fs::create_dir_all(&path)
        .map_err(|e| format!("A schedule backup könyvtár nem hozható létre: {e}"))?;
    Ok(path)
}

#[tauri::command]
fn create_schedule_backup(
    app: AppHandle,
    schedules: Vec<Schedule>,
    revision: Option<u64>,
    checksum: String,
) -> Result<ScheduleBackup, String> {
    let created_at = unix_millis();
    let backup = ScheduleBackup {
        id: format!("schedule-{created_at}"),
        created_at,
        count: schedules.len(),
        revision,
        checksum,
        schedules,
    };
    let path = schedule_backups_dir(&app)?.join(format!("{}.json", backup.id));
    fs::write(
        &path,
        serde_json::to_vec_pretty(&backup).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("A schedule backup nem írható: {e}"))?;
    Ok(backup)
}

#[tauri::command]
fn list_schedule_backups(app: AppHandle) -> Result<Vec<ScheduleBackup>, String> {
    let mut result = Vec::new();
    for entry in fs::read_dir(schedule_backups_dir(&app)?).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|v| v.to_str()) != Some("json") {
            continue;
        }
        if let Ok(bytes) = fs::read(&path) {
            if let Ok(item) = serde_json::from_slice::<ScheduleBackup>(&bytes) {
                result.push(item);
            }
        }
    }
    result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(result)
}

#[tauri::command]
async fn firmware_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<FirmwareStatus, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let mut status = FirmwareStatus {
        state: "idle".into(),
        message: "Nincs folyamatban firmware-frissítés.".into(),
        update_channel: config.update_channel.clone(),
        firmware_update_channel: config.firmware_update_channel.clone(),
        app_current_version: env!("CARGO_PKG_VERSION").into(),
        ..Default::default()
    };

    if cfg!(any(target_os = "android", target_os = "ios")) {
        status.state = "unsupported".into();
        status.message = "Mobilalkalmazásból firmware-frissítés nem indítható. Használj Windows, macOS vagy Linux gépet.".into();
        status.ota_tool_installed = false;
        status.ota_tool_error = Some("OTA mobilplatformon letiltva".into());
        return Ok(status);
    }

    let terminal_mode_result = use_terminal_ota(&app, &config);
    let terminal_mode = matches!(&terminal_mode_result, Ok(true));

    if let Ok(value) = get_json(&state, "/api/v1/status").await {
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

    match terminal_mode_result {
        Ok(true) => {
            let tool = find_ota_tool(&app, &config);
            status.ota_tool_installed = tool.is_some();
            status.ota_tool_path =
                tool.map(|path| format!("macOS Terminal + {}", path.to_string_lossy()));
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
    // A státuszellenőrzés nem olvashatja ki az OTA-jelszót a natív kulcstárból.
    // A tényleges OTA telepítés továbbra is biztonságosan validálja a secretet.
    status.ota_password_configured = true;
    status.backup_store_configured = schedule_backups_dir(&app).is_ok();

    let mut ota_missing_requirements = Vec::new();
    if !status.ota_tool_installed {
        ota_missing_requirements.push(
            status
                .ota_tool_error
                .clone()
                .unwrap_or_else(|| "Az OTA feltöltő nem érhető el.".into()),
        );
    }
    // Az OTA-jelszó tényleges jelenléte telepítéskor kerül ellenőrzésre.
    if status
        .ota_target_address
        .as_deref()
        .map(str::trim)
        .is_none_or(str::is_empty)
        || status.ota_target_port.is_none()
    {
        ota_missing_requirements.push("Az OTA célcím vagy port nem határozható meg.".into());
    }
    status.ota_configured = ota_missing_requirements.is_empty();
    status.ota_missing_requirements = ota_missing_requirements;

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

    match latest_app_release(&config).await {
        Ok(app_release) => {
            status.app_update_available = normalize_version(env!("CARGO_PKG_VERSION"))
                != normalize_version(&app_release.version);
            status.available_app = Some(app_release);
        }
        Err(error) => {
            status.compatibility_status =
                Some(format!("Alkalmazás-release ellenőrzési hiba: {error}"));
        }
    }
    if status.compatibility_status.is_none() {
        status.compatibility_status = Some(format!(
            "alkalmazás {} / firmware {} csatorna: alkalmazás {}, firmware {}",
            config.update_channel,
            config.firmware_update_channel,
            if status.app_update_available {
                "frissíthető"
            } else {
                "naprakész"
            },
            if status.update_available {
                "frissíthető"
            } else {
                "naprakész"
            }
        ));
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
    requested_tag: Option<&str>,
) -> Result<FirmwareStatus, String> {
    state.ota_in_progress.store(true, Ordering::SeqCst);
    state.ota_cancel_requested.store(false, Ordering::SeqCst);
    ensure_not_cancelled(state)?;
    emit_ota_progress(
        app,
        "Indítás",
        "info",
        "Önálló Tauri OTA-frissítés előkészítése…",
        Some(1),
    );

    let config = state
        .config
        .lock()
        .map_err(|_| "Beállítás zárolva".to_string())?
        .clone();
    let password = read_profile_ota_password(&config).await?;
    if password.is_empty() {
        return Err("Hiányzik az OTA-jelszó.".into());
    }
    emit_ota_progress(
        app,
        "Előkészítés",
        "success",
        "OTA-jelszó betöltve.",
        Some(3),
    );
    let terminal_mode = use_terminal_ota(app, &config)?;
    let ota_engine_label = if terminal_mode {
        let tool =
            find_ota_tool(app, &config).ok_or("A Terminal OTA módhoz nem található arduinoOTA.")?;
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

    emit_ota_progress(
        app,
        "GitHub",
        "info",
        "Legfrissebb firmware-kiadás lekérdezése…",
        Some(7),
    );
    ensure_not_cancelled(state)?;
    let artifact = if let Some(version) = requested_tag {
        let release = firmware_beta_release().await?;
        firmware_artifacts_from_release(&release)
            .into_iter()
            .find(|artifact| {
                normalize_version(
                    artifact
                        .firmware_version
                        .as_deref()
                        .unwrap_or(&artifact.tag),
                ) == normalize_version(version)
            })
            .ok_or_else(|| {
                format!(
                    "A(z) {version} firmware nem található a dedikált Beta firmware-katalógusban."
                )
            })?
    } else {
        latest_firmware(&config).await?
    };
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

    emit_ota_progress(
        app,
        "Arduino",
        "info",
        "Arduino státuszának és OTA-céljának ellenőrzése…",
        Some(12),
    );
    ensure_not_cancelled(state)?;
    let status_json = get_json(state, "/api/v1/status")
        .await
        .map_err(|error| format!("OTA indítás előtt nem olvasható az Arduino státusza: {error}"))?;
    let boot_id_before = status_json
        .get("bootId")
        .and_then(Value::as_str)
        .map(str::to_string);
    let schedule_revision_before = status_json.get("scheduleRevision").and_then(Value::as_u64);
    let schedule_checksum_before = status_json
        .get("scheduleChecksum")
        .and_then(Value::as_str)
        .map(str::to_string);
    let installed = status_json
        .get("firmwareVersion")
        .and_then(Value::as_str)
        .map(str::to_string);
    if requested_tag.is_none()
        && installed.as_deref().map(normalize_version) == Some(normalize_version(&available))
    {
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
    ensure_not_cancelled(state)?;
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

    emit_ota_progress(
        app,
        "Ellenőrzés",
        "info",
        "SHA-256 ellenőrzőösszeg letöltése…",
        Some(33),
    );
    ensure_not_cancelled(state)?;
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
    if let Ok(mut current) = state.firmware_status.lock() {
        current.cache_path = Some(binary_path.to_string_lossy().to_string());
        current.cache_sha256 = Some(actual.clone());
        current.boot_id_before = boot_id_before.clone();
        current.schedule_revision_before = schedule_revision_before;
        current.schedule_checksum_before = schedule_checksum_before.clone();
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
    if firmware_feature == "ota-diagnostics" && installed_normalized.as_deref() == Some("4.1.15") {
        emit_ota_progress(
            app,
            "Arduino",
            "info",
            "A 4.1.15 ismert restart-listener hibája miatt az API-s újraindítást kihagyom. A Terminal közvetlenül ellenőrzi a már futó OTA-portot.",
            Some(50),
        );
    } else {
        let mut prepared = false;
        for endpoint in ["/api/v1/ota/prepare"] {
            match post_json(state, endpoint, None).await {
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
        current.message = format!(
            "OTA feltöltés: {}:{} • {}…",
            ota_address, ota_port, ota_engine_label
        );
    }

    emit_ota_progress(
        app,
        "Feltöltés",
        "info",
        if terminal_mode {
            format!(
                "A Tauri macOS Terminal ablakban indítja az arduinoOTA feltöltőt: {}:{} • {} bájt",
                ota_address,
                ota_port,
                firmware.len()
            )
        } else {
            format!(
                "A Tauri beépített kliense küldi a binárist: POST http://{}:{}/sketch • {} bájt",
                ota_address,
                ota_port,
                firmware.len()
            )
        },
        Some(52),
    );

    ensure_not_cancelled(state)?;
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
            config.ota_timeout_seconds,
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

    ensure_not_cancelled(state)?;
    let installed_after_restart =
        confirm_restart(app, state, artifact.firmware_version.clone()).await?;
    ensure_not_cancelled(state)?;
    let after_status = get_json(state, "/api/v1/status")
        .await
        .map_err(|error| format!("Az OTA utáni persistence ellenőrzés sikertelen: {error}"))?;
    let boot_id_after = after_status
        .get("bootId")
        .and_then(Value::as_str)
        .map(str::to_string);
    let schedule_revision_after = after_status.get("scheduleRevision").and_then(Value::as_u64);
    let schedule_checksum_after = after_status
        .get("scheduleChecksum")
        .and_then(Value::as_str)
        .map(str::to_string);
    let boot_id_changed = boot_id_before.is_some() && boot_id_before != boot_id_after;
    if schedule_revision_before != schedule_revision_after
        || schedule_checksum_before != schedule_checksum_after
    {
        return Err(format!(
            "Az időzítések persistence ellenőrzése eltérést talált. Revision: {:?} -> {:?}, checksum: {:?} -> {:?}.",
            schedule_revision_before, schedule_revision_after, schedule_checksum_before, schedule_checksum_after
        ));
    }
    if boot_id_before.is_some() && !boot_id_changed {
        return Err(format!(
            "OTA SIKERTELEN: a várt firmware-verzió elérhető, de a Boot ID nem változott. Boot ID előtte: {:?}, utána: {:?}. Az újraindítás és a flash alkalmazása nem igazolható.",
            boot_id_before, boot_id_after
        ));
    }
    emit_ota_progress(
        app,
        "Persistence",
        "success",
        if boot_id_changed {
            "Boot ID megváltozott, a firmware-verzió és a schedule revision/checksum megmaradása igazolt."
        } else {
            "A firmware és a schedule persistence ellenőrzése sikeres; indulás előtti Boot ID nem állt rendelkezésre."
        },
        Some(98),
    );
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
        ota_configured: true,
        ota_missing_requirements: Vec::new(),
        backup_store_configured: schedule_backups_dir(app).is_ok(),
        available_firmware: Some(artifact),
        firmware_lookup_error: None,
        ota_tool_path: Some(ota_engine_label),
        ota_tool_error: None,
        ota_target_address: Some(ota_address),
        ota_target_port: Some(ota_port),
        update_available: false,
        progress: Some(100),
        phase: Some("Kész".into()),
        update_channel: config.update_channel.clone(),
        firmware_update_channel: config.firmware_update_channel.clone(),
        app_current_version: env!("CARGO_PKG_VERSION").into(),
        available_app: latest_app_release(&config).await.ok(),
        app_update_available: false,
        compatibility_status: Some("Firmware és Direct API kompatibilitási kapu sikeres.".into()),
        cache_path: Some(binary_path.to_string_lossy().to_string()),
        cache_sha256: Some(actual),
        boot_id_before,
        boot_id_after,
        schedule_revision_before,
        schedule_revision_after,
        schedule_checksum_before,
        schedule_checksum_after,
        cancelled: false,
    };
    *state
        .firmware_status
        .lock()
        .map_err(|_| "Firmware állapot zárolva".to_string())? = final_status.clone();
    Ok(final_status)
}

#[tauri::command]
async fn firmware_update(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<FirmwareStatus, String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err("Mobilalkalmazásból firmware-frissítés nem indítható. Használj Windows, macOS vagy Linux gépet.".into());
    }
    match firmware_update_inner(&app, &state, None).await {
        Ok(status) => Ok(status),
        Err(error) => {
            state.ota_in_progress.store(false, Ordering::SeqCst);
            emit_ota_progress(&app, "Hiba", "error", error.clone(), None);
            if let Ok(mut current) = state.firmware_status.lock() {
                current.state = "error".into();
                current.phase = Some("Hiba".into());
                current.message = error.clone();
                current.cancelled = error.starts_with("OTA_CANCELLED:");
            }
            Err(error)
        }
    }
}

#[tauri::command]
async fn firmware_install_release(
    app: AppHandle,
    state: State<'_, AppState>,
    tag: String,
) -> Result<FirmwareStatus, String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err("Mobilalkalmazásból firmware-frissítés nem indítható.".into());
    }
    match firmware_update_inner(&app, &state, Some(tag.trim())).await {
        Ok(status) => Ok(status),
        Err(error) => {
            state.ota_in_progress.store(false, Ordering::SeqCst);
            emit_ota_progress(&app, "Hiba", "error", error.clone(), None);
            if let Ok(mut current) = state.firmware_status.lock() {
                current.state = "error".into();
                current.phase = Some("Hiba".into());
                current.message = error.clone();
                current.cancelled = error.starts_with("OTA_CANCELLED:");
            }
            Err(error)
        }
    }
}

#[tauri::command]
fn firmware_cancel(state: State<'_, AppState>) -> Result<bool, String> {
    if cfg!(any(target_os = "android", target_os = "ios")) {
        return Err(
            "Mobilalkalmazásban nincs OTA-művelet, ezért megszakítás sem indítható.".into(),
        );
    }
    if !state.ota_in_progress.load(Ordering::SeqCst) {
        return Ok(false);
    }
    state.ota_cancel_requested.store(true, Ordering::SeqCst);
    if let Ok(mut current) = state.firmware_status.lock() {
        current.state = "cancelling".into();
        current.phase = Some("Megszakítás".into());
        current.message = "A firmware-frissítés megszakítása folyamatban…".into();
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

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
        assert_eq!(
            output.get("logs").and_then(Value::as_array).map(Vec::len),
            Some(2)
        );
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
    fn empty_action_schedule_roundtrips_without_being_dropped() {
        let mut bytes = vec![6, 19, 30];
        bytes.extend_from_slice(&[0; 24]);
        let payload = hex::encode(bytes);

        let decoded = decode_schedule_payload(&payload, 32)
            .expect("az üres LED-műveletű Arduino rekord olvasható");
        let schedule = decoded.schedule;
        assert_eq!(schedule.id, "arduino-32");
        assert_eq!(schedule.day, 6);
        assert_eq!(schedule.time, "19:30");
        assert!(schedule.leds.is_empty());
        assert_eq!(decoded.recovered_legacy_action_count, 0);

        let encoded = encode_schedule(&schedule).expect("az üres rekord visszakódolható");
        assert_eq!(encoded, payload);

        let file = schedule_file_bytes(vec![schedule])
            .expect("az üres LED-műveletű rekord a cache-ben is megőrizhető");
        let parsed = parse_schedules_json(&file).expect("a cache visszaolvasható");
        assert_eq!(parsed.len(), 1);
        assert!(parsed[0].leds.is_empty());
    }

    #[test]
    fn missing_apply_flag_is_recovered_from_preserved_led_payload() {
        let mut bytes = vec![6, 19, 30];
        bytes.extend_from_slice(&[0, 1, 60, 0, 50, 0, 0, 255]);
        bytes.extend_from_slice(&[0; 16]);
        let legacy_payload = hex::encode(bytes);

        let decoded = decode_schedule_payload(&legacy_payload, 0)
            .expect("a megmaradt LED-adatból az örökölt művelet helyreállítható");
        assert_eq!(decoded.recovered_legacy_action_count, 1);
        assert_eq!(decoded.schedule.leds.len(), 1);
        assert_eq!(decoded.schedule.leds[0].id, 1);
        assert!(decoded.schedule.leds[0].enabled);
        assert_eq!(decoded.schedule.leds[0].brightness, 60);
        assert_eq!(decoded.schedule.leds[0].speed, 50);
        assert_eq!(decoded.schedule.leds[0].color, vec![0, 0, 255]);

        let normalized = encode_schedule(&decoded.schedule)
            .expect("a helyreállított rekord explicit apply jelzővel visszakódolható");
        assert_eq!(&normalized[6..8], "01");
        assert_ne!(normalized, legacy_payload);
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
    fn ota_timeout_is_clamped_to_supported_range() {
        assert_eq!(normalized_ota_timeout_seconds(1), 30);
        assert_eq!(normalized_ota_timeout_seconds(120), 120);
        assert_eq!(normalized_ota_timeout_seconds(900), 600);
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
            let config = fs::read(config_path(app.handle()).map_err(std::io::Error::other)?)
                .ok()
                .and_then(|b| serde_json::from_slice(&b).ok())
                .unwrap_or_default();
            app.manage(AppState {
                config: Mutex::new(config),
                network_logs: Mutex::new(Vec::new()),
                firmware_status: Mutex::new(FirmwareStatus::default()),
                arduino_request_lock: Arc::new(Mutex::new(())),
                ota_in_progress: Arc::new(AtomicBool::new(false)),
                ota_cancel_requested: Arc::new(AtomicBool::new(false)),
                last_known_local_ip: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_capabilities,
            load_config,
            migrate_native_credentials,
            save_config,
            save_ota_password,
            arduino_status,
            sync_time_config,
            arduino_logs,
            network_logs,
            set_led,
            load_schedules,
            import_schedules_file,
            export_schedules_file,
            load_schedules_from_arduino,
            save_and_sync_schedules,
            create_schedule_backup,
            list_schedule_backups,
            firmware_releases,
            firmware_install_release,
            firmware_status,
            firmware_update,
            firmware_cancel,
            credential_bridge::credential_status,
            credential_bridge::credential_get,
            credential_bridge::credential_set,
            credential_bridge::credential_delete
        ])
        .run(tauri::generate_context!())
        .expect("Tauri application error");
}
