use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use thiserror::Error;

pub const DEFAULT_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
pub const DEFAULT_RESPONSE_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectApiTarget {
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub api_path: String,
    pub device_key: String,
}

impl DirectApiTarget {
    pub fn validate(&self) -> Result<(), CoreError> {
        let protocol = self.protocol.trim().to_ascii_lowercase();
        if !matches!(protocol.as_str(), "http" | "https") {
            return Err(CoreError::InvalidConfig(
                "protocol must be http or https".into(),
            ));
        }
        if self.host.trim().is_empty() || self.port == 0 || self.device_key.trim().is_empty() {
            return Err(CoreError::InvalidConfig(
                "host, port and device key are required".into(),
            ));
        }
        Ok(())
    }

    pub fn protected_path(&self, path: &str) -> Result<String, CoreError> {
        let base = self.api_path.trim().trim_end_matches('/');
        let path = if path.starts_with('/') {
            path.to_string()
        } else {
            format!("/{path}")
        };
        if base.is_empty() {
            return Ok(path);
        }
        if !base.starts_with('/') {
            return Err(CoreError::InvalidConfig(
                "api path must start with /".into(),
            ));
        }
        if path == base || path.starts_with(&format!("{base}/")) {
            Ok(path)
        } else {
            Ok(format!("{base}{path}"))
        }
    }

    pub fn url_for(&self, path: &str) -> Result<String, CoreError> {
        self.validate()?;
        Ok(format!(
            "{}://{}:{}{}",
            self.protocol.trim().to_ascii_lowercase(),
            self.host.trim(),
            self.port,
            self.protected_path(path)?
        ))
    }
}

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("invalid HTTP method: {0}")]
    InvalidMethod(String),
    #[error("HTTP client error: {0}")]
    Client(String),
    #[error("request failed for {url}: {message}")]
    Request { url: String, message: String },
    #[error("HTTP {status} from {url}: {preview}")]
    HttpStatus {
        status: u16,
        url: String,
        preview: String,
    },
    #[error("empty response from {0}")]
    EmptyResponse(String),
    #[error("invalid JSON from {url}: {message}; preview: {preview}")]
    InvalidJson {
        url: String,
        message: String,
        preview: String,
    },
}

pub fn request_json_blocking(
    target: &DirectApiTarget,
    method: &str,
    path: &str,
    body: Option<&Value>,
    connect_timeout: Duration,
    response_timeout: Duration,
) -> Result<Value, CoreError> {
    let url = target.url_for(path)?;
    let client = Client::builder()
        .connect_timeout(connect_timeout)
        .timeout(response_timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| CoreError::Client(e.to_string()))?;
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| CoreError::InvalidMethod(e.to_string()))?;
    let mut request = client
        .request(method, &url)
        .header("Accept", "application/json")
        .header("X-Device-Key", target.device_key.trim())
        .header("Connection", "close");
    if let Some(payload) = body {
        request = request
            .header("Content-Type", "application/json")
            .json(payload);
    }
    let response = request.send().map_err(|e| CoreError::Request {
        url: url.clone(),
        message: e.to_string(),
    })?;
    let status = response.status();
    let bytes = response.bytes().map_err(|e| CoreError::Request {
        url: url.clone(),
        message: e.to_string(),
    })?;
    if !status.is_success() {
        return Err(CoreError::HttpStatus {
            status: status.as_u16(),
            url,
            preview: String::from_utf8_lossy(&bytes).chars().take(240).collect(),
        });
    }
    if bytes.is_empty() {
        return Err(CoreError::EmptyResponse(url));
    }
    serde_json::from_slice(&bytes).map_err(|e| CoreError::InvalidJson {
        url,
        message: e.to_string(),
        preview: String::from_utf8_lossy(&bytes).chars().take(240).collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn target() -> DirectApiTarget {
        DirectApiTarget {
            protocol: "https".into(),
            host: "example.invalid".into(),
            port: 443,
            api_path: "/api/v1".into(),
            device_key: "secret".into(),
        }
    }
    #[test]
    fn joins_api_path() {
        assert_eq!(
            target().url_for("/status").unwrap(),
            "https://example.invalid:443/api/v1/status"
        );
    }
    #[test]
    fn avoids_double_api_path() {
        assert_eq!(
            target().url_for("/api/v1/status").unwrap(),
            "https://example.invalid:443/api/v1/status"
        );
    }
}
