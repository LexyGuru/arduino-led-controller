use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, net::IpAddr, path::PathBuf, sync::Mutex, time::Duration};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config { arduino_ip: String, arduino_port: u16 }

impl Default for Config { fn default() -> Self { Self { arduino_ip: "10.0.0.117".into(), arduino_port: 80 } } }
struct AppState { config: Mutex<Config>, client: Client }

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
  let mut directory = app.path().app_config_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
  directory.push("connection.json"); Ok(directory)
}
fn validate(config: &Config) -> Result<(), String> { config.arduino_ip.parse::<IpAddr>().map_err(|_| "Érvénytelen Arduino IP-cím.".to_string())?; if config.arduino_port == 0 { return Err("Érvénytelen port.".into()); } Ok(()) }
fn url(config: &Config, path: &str) -> String { format!("http://{}:{}{}", config.arduino_ip, config.arduino_port, path) }
async fn get_json(state: &AppState, path: &str) -> Result<Value, String> {
  let config = state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())?.clone();
  state.client.get(url(&config, path)).send().await.map_err(|e| format!("Arduino kapcsolat: {e}"))?.error_for_status().map_err(|e| format!("Arduino HTTP hiba: {e}"))?.json().await.map_err(|e| format!("Arduino válaszhiba: {e}"))
}
#[tauri::command] fn load_config(state: State<AppState>) -> Result<Config, String> { Ok(state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())?.clone()) }
#[tauri::command] fn save_config(app: AppHandle, state: State<AppState>, config: Config) -> Result<(), String> { validate(&config)?; fs::write(config_path(&app)?, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?; *state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())? = config; Ok(()) }
#[tauri::command] async fn arduino_status(state: State<'_, AppState>) -> Result<Value, String> { get_json(&state, "/api/status").await }
#[tauri::command] async fn arduino_logs(state: State<'_, AppState>) -> Result<Value, String> { get_json(&state, "/api/console/logs").await }
#[tauri::command] async fn set_led(state: State<'_, AppState>, id: u8, enabled: bool, brightness: u8, effect: u8, speed: u8, color: Vec<u8>) -> Result<Value, String> {
  if !(1..=3).contains(&id) || color.len() != 3 || effect > 4 || speed == 0 { return Err("Érvénytelen LED-beállítás.".into()); }
  get_json(&state, &format!("/api/led/{id}?enabled={}&brightness={brightness}&effect={effect}&speed={speed}&color={},{},{}", if enabled { 1 } else { 0 }, color[0], color[1], color[2])).await
}
pub fn run() {
  tauri::Builder::default().plugin(tauri_plugin_opener::init()).setup(|app| {
    let path = config_path(app.handle()).map_err(std::io::Error::other)?;
    let config = fs::read(&path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default();
    let client = Client::builder().timeout(Duration::from_secs(12)).build().map_err(std::io::Error::other)?;
    app.manage(AppState { config: Mutex::new(config), client }); Ok(())
  }).invoke_handler(tauri::generate_handler![load_config, save_config, arduino_status, arduino_logs, set_led]).run(tauri::generate_context!()).expect("Tauri application error");
}
