use arduino_led_core::{
    request_json_blocking, DirectApiTarget, DEFAULT_CONNECT_TIMEOUT, DEFAULT_RESPONSE_TIMEOUT,
};
use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        OriginalUri, Path, State,
    },
    http::{Method, StatusCode},
    response::Response,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Serialize;
use serde_json::{json, Value};
use std::{env, fs, net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use tokio::task;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

#[derive(Clone)]
struct AppState {
    target: Arc<DirectApiTarget>,
    firmware_catalog: Option<PathBuf>,
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
        "webRoot": web_root
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
