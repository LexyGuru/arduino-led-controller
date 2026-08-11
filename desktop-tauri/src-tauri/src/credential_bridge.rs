use serde::Serialize;

const ALLOWED_SERVICE: &str = "arduino-led-controller";

const LEGACY_ACCOUNT: &str = "api-v2-bearer";

const DIRECT_PREFIX: &str = "direct:";

const MIN_SECRET_BYTES: usize = 16;
const MAX_SECRET_BYTES: usize = 8192;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatus {
    supported: bool,
    available: bool,
    backend: String,
    platform: String,
    service: String,
    account: String,
    present: Option<bool>,
    error_code: Option<String>,
}

fn validate_scope(service: &str, account: &str) -> Result<(), String> {
    if service != ALLOWED_SERVICE {
        return Err("CREDENTIAL_SCOPE_DENIED: érvénytelen service.".to_string());
    }

    let valid_direct = account.starts_with(DIRECT_PREFIX)
        && (account.ends_with(":device-key") || account.ends_with(":ota-password"))
        && account.len() <= 160
        && account
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b':' | b'-' | b'_' | b'.'));

    if account != LEGACY_ACCOUNT && !valid_direct {
        return Err("CREDENTIAL_SCOPE_DENIED: érvénytelen account.".to_string());
    }

    Ok(())
}

fn validate_secret(secret: &str) -> Result<(), String> {
    if secret.trim() != secret {
        return Err(
            "CREDENTIAL_SECRET_WHITESPACE: a token nem kezdődhet vagy végződhet szóközzel."
                .to_string(),
        );
    }

    let bytes = secret.len();

    if bytes < MIN_SECRET_BYTES {
        return Err("CREDENTIAL_SECRET_TOO_SHORT: a token túl rövid.".to_string());
    }

    if bytes > MAX_SECRET_BYTES {
        return Err("CREDENTIAL_SECRET_TOO_LONG: a token túl hosszú.".to_string());
    }

    Ok(())
}

fn platform_name() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        return "macos";
    }
    #[cfg(target_os = "windows")]
    {
        return "windows";
    }
    #[cfg(target_os = "linux")]
    {
        return "linux";
    }
    #[cfg(target_os = "ios")]
    {
        return "ios";
    }
    #[cfg(target_os = "android")]
    {
        return "android";
    }

    #[allow(unreachable_code)]
    "unsupported"
}

fn backend_name() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        return "apple-keychain";
    }
    #[cfg(target_os = "windows")]
    {
        return "windows-credential-manager";
    }
    #[cfg(target_os = "linux")]
    {
        return "linux-secret-service";
    }
    #[cfg(target_os = "ios")]
    {
        return "apple-protected-data";
    }
    #[cfg(target_os = "android")]
    {
        return "android-keystore-shared-preferences";
    }

    #[allow(unreachable_code)]
    "unsupported"
}

fn unsupported_status() -> CredentialStatus {
    CredentialStatus {
        supported: false,
        available: false,
        backend: backend_name().to_string(),
        platform: platform_name().to_string(),
        service: ALLOWED_SERVICE.to_string(),
        account: LEGACY_ACCOUNT.to_string(),
        present: None,
        error_code: Some("CREDENTIAL_STORE_UNSUPPORTED".to_string()),
    }
}

#[cfg(any(
    target_os = "macos",
    target_os = "windows",
    target_os = "linux",
    target_os = "ios",
    target_os = "android"
))]
mod desktop {
    use super::{backend_name, platform_name, CredentialStatus, ALLOWED_SERVICE};

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    use keyring::{Entry, Error as KeyringError};

    #[cfg(any(target_os = "ios", target_os = "android"))]
    use keyring_core::{Entry, Error as KeyringError};
    use std::{
        collections::HashMap,
        sync::{Mutex, OnceLock},
    };
    use zeroize::Zeroizing;

    static SESSION_CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

    fn session_cache() -> &'static Mutex<HashMap<String, String>> {
        SESSION_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
    }

    fn cached(account: &str) -> Option<String> {
        session_cache().lock().ok()?.get(account).cloned()
    }

    fn cache(account: &str, secret: &str) {
        if let Ok(mut values) = session_cache().lock() {
            values.insert(account.to_string(), secret.to_string());
        }
    }

    fn evict(account: &str) {
        if let Ok(mut values) = session_cache().lock() {
            values.remove(account);
        }
    }

    // MOBILE_NATIVE_CREDENTIAL_STORE_V158
    fn ensure_platform_store() -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            use apple_native_keyring_store::protected::Store;
            use keyring_core::set_default_store;
            set_default_store(Store::new().map_err(|_| {
                "CREDENTIAL_STORE_INIT_ERROR: az iOS Protected Data kulcstár nem inicializálható."
                    .to_string()
            })?);
        }

        #[cfg(target_os = "android")]
        {
            use android_native_keyring_store::Store;
            use keyring_core::set_default_store;
            set_default_store(Store::new().map_err(|_| {
                "CREDENTIAL_STORE_INIT_ERROR: az Android natív kulcstár nem inicializálható."
                    .to_string()
            })?);
        }

        Ok(())
    }

    fn create_entry(account: &str) -> Result<Entry, String> {
        ensure_platform_store()?;
        Entry::new(ALLOWED_SERVICE, account).map_err(|_| {
            "CREDENTIAL_ENTRY_ERROR: a natív kulcstár-bejegyzés nem hozható létre.".to_string()
        })
    }

    fn operation_error(operation: &str, error: KeyringError) -> String {
        match error {
            KeyringError::NoEntry => {
                format!("CREDENTIAL_NO_ENTRY: {operation}")
            }
            _ => {
                format!("CREDENTIAL_STORE_ERROR: {operation}")
            }
        }
    }

    async fn blocking<T, F>(operation: F) -> Result<T, String>
    where
        T: Send + 'static,
        F: FnOnce() -> Result<T, String> + Send + 'static,
    {
        tauri::async_runtime::spawn_blocking(operation)
            .await
            .map_err(|_| "CREDENTIAL_TASK_ERROR: a natív kulcstárfeladat megszakadt.".to_string())?
    }

    pub async fn status(account: String) -> CredentialStatus {
        if cached(&account).is_some() {
            return CredentialStatus {
                supported: true,
                available: true,
                backend: backend_name().to_string(),
                platform: platform_name().to_string(),
                service: ALLOWED_SERVICE.to_string(),
                account,
                present: Some(true),
                error_code: None,
            };
        }
        let task_account = account.clone();
        let result = blocking(move || {
            let entry = create_entry(&task_account)?;

            match entry.get_password() {
                Ok(password) => {
                    cache(&task_account, &password);
                    let _password = Zeroizing::new(password);

                    Ok(true)
                }
                Err(KeyringError::NoEntry) => Ok(false),
                Err(error) => Err(operation_error("status", error)),
            }
        })
        .await;

        match result {
            Ok(present) => CredentialStatus {
                supported: true,
                available: true,
                backend: backend_name().to_string(),
                platform: platform_name().to_string(),
                service: ALLOWED_SERVICE.to_string(),
                account: account.clone(),
                present: Some(present),
                error_code: None,
            },
            Err(error) => CredentialStatus {
                supported: true,
                available: false,
                backend: backend_name().to_string(),
                platform: platform_name().to_string(),
                service: ALLOWED_SERVICE.to_string(),
                account: account.clone(),
                present: None,
                error_code: Some(
                    error
                        .split(':')
                        .next()
                        .unwrap_or("CREDENTIAL_STORE_ERROR")
                        .to_string(),
                ),
            },
        }
    }

    pub async fn get(account: String) -> Result<Option<String>, String> {
        if let Some(secret) = cached(&account) {
            return Ok(Some(secret));
        }
        blocking(move || {
            let entry = create_entry(&account)?;

            match entry.get_password() {
                Ok(password) => {
                    cache(&account, &password);
                    Ok(Some(password))
                }
                Err(KeyringError::NoEntry) => Ok(None),
                Err(error) => Err(operation_error("get", error)),
            }
        })
        .await
    }

    pub async fn set(account: String, secret: String) -> Result<(), String> {
        blocking(move || {
            let entry = create_entry(&account)?;

            let secret = Zeroizing::new(secret);

            entry
                .set_password(secret.as_str())
                .map_err(|error| operation_error("set", error))?;
            cache(&account, secret.as_str());
            Ok(())
        })
        .await
    }

    pub async fn delete(account: String) -> Result<bool, String> {
        blocking(move || {
            let entry = create_entry(&account)?;

            match entry.delete_credential() {
                Ok(()) => {
                    evict(&account);
                    Ok(true)
                }
                Err(KeyringError::NoEntry) => {
                    evict(&account);
                    Ok(false)
                }
                Err(error) => Err(operation_error("delete", error)),
            }
        })
        .await
    }
}

pub async fn get_profile_secret(account: String) -> Result<Option<String>, String> {
    validate_scope(ALLOWED_SERVICE, &account)?;
    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return desktop::get(account).await;
    }
    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

pub async fn set_profile_secret(account: String, secret: String) -> Result<(), String> {
    validate_scope(ALLOWED_SERVICE, &account)?;
    validate_secret(&secret)?;
    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return desktop::set(account, secret).await;
    }
    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[tauri::command]
pub async fn credential_status(
    service: String,
    account: String,
) -> Result<CredentialStatus, String> {
    validate_scope(&service, &account)?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return Ok(desktop::status(account).await);
    }

    #[allow(unreachable_code)]
    Ok(unsupported_status())
}

#[tauri::command]
pub async fn credential_get(service: String, account: String) -> Result<Option<String>, String> {
    validate_scope(&service, &account)?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return desktop::get(account).await;
    }

    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[tauri::command]
pub async fn credential_set(
    service: String,
    account: String,
    secret: String,
) -> Result<(), String> {
    validate_scope(&service, &account)?;

    validate_secret(&secret)?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return desktop::set(account, secret).await;
    }

    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[tauri::command]
pub async fn credential_delete(service: String, account: String) -> Result<bool, String> {
    validate_scope(&service, &account)?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    ))]
    {
        return desktop::delete(account).await;
    }

    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::LEGACY_ACCOUNT;
    use super::{validate_scope, validate_secret, ALLOWED_SERVICE, MAX_SECRET_BYTES};

    #[test]
    fn only_fixed_scope_is_allowed() {
        assert!(validate_scope(ALLOWED_SERVICE, LEGACY_ACCOUNT,).is_ok());

        assert!(validate_scope("other-service", LEGACY_ACCOUNT,).is_err());

        assert!(validate_scope(ALLOWED_SERVICE, "other-account",).is_err());
    }

    #[test]
    fn secret_length_and_whitespace_are_checked() {
        assert!(validate_secret("0123456789abcdef",).is_ok());

        assert!(validate_secret(" short-secret ").is_err());

        assert!(validate_secret("too-short",).is_err());

        assert!(validate_secret(&"x".repeat(MAX_SECRET_BYTES + 1,),).is_err());
    }
}
