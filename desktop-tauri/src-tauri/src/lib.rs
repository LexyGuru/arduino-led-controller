use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, net::IpAddr, path::PathBuf, sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config { arduino_ip: String, arduino_port: u16 }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleLed { id: u8, enabled: bool, brightness: u8, effect: u8, speed: u8, color: Vec<u8> }
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Schedule { id: String, day: u8, time: String, leds: Vec<ScheduleLed> }
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkLog { timestamp: u64, endpoint: String, ok: bool, message: String }

impl Default for Config { fn default() -> Self { Self { arduino_ip: "10.0.0.117".into(), arduino_port: 80 } } }
struct AppState { config: Mutex<Config>, client: Client, network_logs: Mutex<Vec<NetworkLog>> }

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
  let mut directory = app.path().app_config_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
  directory.push("connection.json"); Ok(directory)
}
fn schedules_path(app: &AppHandle) -> Result<PathBuf, String> { let mut path = config_path(app)?; path.set_file_name("weekly-led-schedules.json"); Ok(path) }
fn validate(config: &Config) -> Result<(), String> { config.arduino_ip.parse::<IpAddr>().map_err(|_| "Érvénytelen Arduino IP-cím.".to_string())?; if config.arduino_port == 0 { return Err("Érvénytelen port.".into()); } Ok(()) }
fn url(config: &Config, path: &str) -> String { format!("http://{}:{}{}", config.arduino_ip, config.arduino_port, path) }
fn network_log(state: &AppState, endpoint: &str, ok: bool, message: String) {
  let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
  if let Ok(mut logs) = state.network_logs.lock() {
    logs.push(NetworkLog { timestamp, endpoint: endpoint.into(), ok, message });
    let excess = logs.len().saturating_sub(80);
    if excess > 0 { logs.drain(0..excess); }
  }
}
async fn get_json(state: &AppState, path: &str) -> Result<Value, String> {
  let config = state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())?.clone();
  let endpoint = url(&config, path);
  let response = match state.client.get(&endpoint).send().await {
    Ok(response) => response,
    Err(error) => {
      let message = format!("Kapcsolati hiba: {error:#}");
      network_log(state, &endpoint, false, message.clone());
      return Err(format!("Arduino kapcsolat: {message}"));
    }
  };
  let response = match response.error_for_status() {
    Ok(response) => response,
    Err(error) => {
      let message = format!("HTTP hiba: {error:#}");
      network_log(state, &endpoint, false, message.clone());
      return Err(format!("Arduino HTTP hiba: {message}"));
    }
  };
  match response.json().await {
    Ok(value) => { network_log(state, &endpoint, true, "HTTP kérés sikeres".into()); Ok(value) }
    Err(error) => {
      let message = format!("Válaszfeldolgozási hiba: {error:#}");
      network_log(state, &endpoint, false, message.clone());
      Err(format!("Arduino válaszhiba: {message}"))
    }
  }
}
fn validate_schedules(schedules: &[Schedule]) -> Result<(), String> {
  if schedules.len() > 60 { return Err("Az Arduino legfeljebb 60 időzítést tárolhat.".into()); }
  for schedule in schedules { if !(1..=7).contains(&schedule.day) || schedule.time.len() != 5 || schedule.leds.is_empty() { return Err("Érvénytelen időzítés.".into()); } for led in &schedule.leds { if !(1..=3).contains(&led.id) || led.effect > 4 || led.speed == 0 || led.color.len() != 3 { return Err("Érvénytelen LED-időzítés.".into()); } } } Ok(())
}
fn encode_schedule(schedule: &Schedule) -> String { let mut bytes = vec![schedule.day, schedule.time[0..2].parse().unwrap_or(0), schedule.time[3..5].parse().unwrap_or(0)]; for id in 1..=3 { if let Some(led) = schedule.leds.iter().find(|led| led.id == id) { bytes.extend_from_slice(&[1, led.enabled as u8, led.brightness, led.effect, led.speed, led.color[0], led.color[1], led.color[2]]); } else { bytes.extend_from_slice(&[0; 8]); } } bytes.iter().map(|byte| format!("{byte:02x}")).collect() }
#[tauri::command] fn load_config(state: State<AppState>) -> Result<Config, String> { Ok(state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())?.clone()) }
#[tauri::command] fn save_config(app: AppHandle, state: State<AppState>, config: Config) -> Result<(), String> { validate(&config)?; fs::write(config_path(&app)?, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?; *state.config.lock().map_err(|_| "A beállítás zárolva van.".to_string())? = config; Ok(()) }
#[tauri::command] async fn arduino_status(state: State<'_, AppState>) -> Result<Value, String> { get_json(&state, "/api/status").await }
#[tauri::command] async fn arduino_logs(state: State<'_, AppState>) -> Result<Value, String> { get_json(&state, "/api/console/logs").await }
#[tauri::command] fn network_logs(state: State<AppState>) -> Result<Vec<NetworkLog>, String> { Ok(state.network_logs.lock().map_err(|_| "A hálózati napló zárolva van.".to_string())?.clone()) }
#[tauri::command] async fn set_led(state: State<'_, AppState>, id: u8, enabled: bool, brightness: u8, effect: u8, speed: u8, color: Vec<u8>) -> Result<Value, String> {
  if !(1..=3).contains(&id) || color.len() != 3 || effect > 4 || speed == 0 { return Err("Érvénytelen LED-beállítás.".into()); }
  get_json(&state, &format!("/api/led/{id}?enabled={}&brightness={brightness}&effect={effect}&speed={speed}&color={},{},{}", if enabled { 1 } else { 0 }, color[0], color[1], color[2])).await
}
#[tauri::command] fn load_schedules(app: AppHandle) -> Result<Vec<Schedule>, String> { Ok(fs::read(schedules_path(&app)?).ok().and_then(|data| serde_json::from_slice(&data).ok()).unwrap_or_default()) }
#[tauri::command] async fn save_and_sync_schedules(app: AppHandle, state: State<'_, AppState>, schedules: Vec<Schedule>) -> Result<Value, String> {
  validate_schedules(&schedules)?; fs::write(schedules_path(&app)?, serde_json::to_vec_pretty(&schedules).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
  if schedules.is_empty() { return get_json(&state, "/api/schedules/clear").await; }
  let mut result = Value::Null; for (index, schedule) in schedules.iter().enumerate() { result = get_json(&state, &format!("/api/schedules/chunk?index={index}&total={}&payload={}", schedules.len(), encode_schedule(schedule))).await?; } Ok(result)
}
pub fn run() {
  tauri::Builder::default().plugin(tauri_plugin_opener::init()).setup(|app| {
    let path = config_path(app.handle()).map_err(std::io::Error::other)?;
    let config = fs::read(&path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default();
    // A helyi Arduino-címeket mindig közvetlenül érjük el. Ez megakadályozza,
    // hogy egy macOS/munkahelyi rendszerproxy a 10.x.x.x hálózati kéréseket
    // hibásan maga felé terelje.
    let client = Client::builder().no_proxy().timeout(Duration::from_secs(12)).build().map_err(std::io::Error::other)?;
    app.manage(AppState { config: Mutex::new(config), client, network_logs: Mutex::new(Vec::new()) }); Ok(())
  }).invoke_handler(tauri::generate_handler![load_config, save_config, arduino_status, arduino_logs, network_logs, set_led, load_schedules, save_and_sync_schedules]).run(tauri::generate_context!()).expect("Tauri application error");
}
