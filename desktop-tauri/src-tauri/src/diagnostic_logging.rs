use serde_json::{json, Value};
use std::{
    fs,
    fs::OpenOptions,
    io::Write,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;
const ROTATED_FILES: usize = 5;
static LOG_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn lock() -> &'static Mutex<()> { LOG_LOCK.get_or_init(|| Mutex::new(())) }
fn unix_millis() -> u128 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() }
fn platform_name() -> &'static str {
    if cfg!(target_os = "ios") { "ios-ipados" }
    else if cfg!(target_os = "android") { "android" }
    else if cfg!(target_os = "macos") { "desktop-macos" }
    else if cfg!(target_os = "windows") { "desktop-windows" }
    else if cfg!(target_os = "linux") { "desktop-linux" }
    else { "unknown" }
}
fn sanitize_string(value: &str) -> String {
    let lower = value.to_ascii_lowercase();
    let sensitive = ["x-device-key", "authorization:", "bearer ", "ota-password", "ota_password", "password=", "\"password\"", "\"arduinoapikey\"", "\"arduino_api_key\"", "\"token\"", "\"secret\""];
    if sensitive.iter().any(|needle| lower.contains(needle)) { "[REDACTED_SENSITIVE_LOG_MESSAGE]".to_string() } else { value.to_string() }
}
fn sanitize_value(value: Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut output = serde_json::Map::new();
            for (key, value) in map {
                let lower = key.to_ascii_lowercase();
                if lower.contains("password") || lower.contains("secret") || lower.contains("token") || lower.contains("devicekey") || lower.contains("api_key") || lower.contains("apikey") || lower == "authorization" {
                    output.insert(key, Value::String("[REDACTED]".into()));
                } else { output.insert(key, sanitize_value(value)); }
            }
            Value::Object(output)
        }
        Value::Array(values) => Value::Array(values.into_iter().map(sanitize_value).collect()),
        Value::String(value) => Value::String(sanitize_string(&value)),
        other => other,
    }
}
fn logs_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|path| path.join("logs")).map_err(|error| format!("A log könyvtár nem állapítható meg: {error}"))
}
fn category_dir(app: &AppHandle, category: &str) -> Result<PathBuf, String> {
    let safe: String = category.chars().map(|ch| if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_') { ch } else { '_' }).collect();
    Ok(logs_root(app)?.join(if safe.is_empty() { "app" } else { &safe }))
}
fn rotate(path: &Path) -> Result<(), String> {
    if path.metadata().map(|m| m.len()).unwrap_or(0) < MAX_LOG_BYTES { return Ok(()); }
    for index in (1..=ROTATED_FILES).rev() {
        let from = if index == 1 { path.to_path_buf() } else { path.with_extension(format!("jsonl.{}", index - 1)) };
        let to = path.with_extension(format!("jsonl.{index}"));
        if from.exists() {
            if index == ROTATED_FILES && to.exists() { let _ = fs::remove_file(&to); }
            let _ = fs::rename(&from, &to);
        }
    }
    Ok(())
}
fn append_jsonl(path: &Path, record: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|error| format!("A log könyvtár nem hozható létre: {error}"))?; }
    rotate(path)?;
    let mut file = OpenOptions::new().create(true).append(true).open(path).map_err(|error| format!("A logfájl nem nyitható meg: {error}"))?;
    serde_json::to_writer(&mut file, record).map_err(|error| format!("A logrekord nem írható: {error}"))?;
    file.write_all(b"\n").map_err(|error| format!("A logrekord lezárása sikertelen: {error}"))
}
pub fn log_event(app: &AppHandle, level: &str, category: &str, event: &str, message: &str, fields: Option<Value>) {
    let Ok(_guard) = lock().lock() else { return; };
    let record = json!({
        "timestampUnixMs": unix_millis(), "level": level, "category": category, "event": event,
        "message": sanitize_string(message), "platform": platform_name(), "appVersion": env!("CARGO_PKG_VERSION"),
        "fields": sanitize_value(fields.unwrap_or(Value::Null)),
    });
    let normalized_category = category.trim().to_ascii_lowercase();

    // Category stream: exactly one write.
    if let Ok(dir) = category_dir(app, &normalized_category) {
        let _ = append_jsonl(&dir.join("current.jsonl"), &record);
    }

    // Global app stream mirrors non-app categories once.
    // Error stream mirrors error events unless category itself is errors.
    if let Ok(root) = logs_root(app) {
        if normalized_category != "app" {
            let _ = append_jsonl(&root.join("app").join("current.jsonl"), &record);
        }
        if level.eq_ignore_ascii_case("error") && normalized_category != "errors" {
            let _ = append_jsonl(&root.join("errors").join("current.jsonl"), &record);
        }
    }
}
pub fn log_ota_progress(app: &AppHandle, phase: &str, kind: &str, message: &str, progress: Option<u8>) {
    let level = match kind { "error" => "error", "warning" | "warn" => "warning", _ => "info" };
    log_event(app, level, "ota", "OTA_PROGRESS", message, Some(json!({ "phase": phase, "kind": kind, "progress": progress })));
}
#[tauri::command]
pub fn diagnostic_log_event(app: AppHandle, level: String, category: String, event: String, message: String, fields: Option<Value>) -> Result<(), String> {
    log_event(&app, &level, &category, &event, &message, fields); Ok(())
}
#[tauri::command]
pub fn diagnostic_log_paths(app: AppHandle) -> Result<Value, String> {
    let root = logs_root(&app)?; fs::create_dir_all(&root).map_err(|error| format!("A log könyvtár nem hozható létre: {error}"))?;
    Ok(json!({ "root": root.to_string_lossy(), "platform": platform_name(), "appVersion": env!("CARGO_PKG_VERSION"), "rotationMaxBytes": MAX_LOG_BYTES, "rotationFiles": ROTATED_FILES }))
}
