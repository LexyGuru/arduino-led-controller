use serde::Serialize;

const ALLOWED_SERVICE: &str =
    "arduino-led-controller";

const ALLOWED_ACCOUNT: &str =
    "api-v2-bearer";

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

fn validate_scope(
    service: &str,
    account: &str,
) -> Result<(), String> {
    if service != ALLOWED_SERVICE {
        return Err(
            "CREDENTIAL_SCOPE_DENIED: érvénytelen service."
                .to_string(),
        );
    }

    if account != ALLOWED_ACCOUNT {
        return Err(
            "CREDENTIAL_SCOPE_DENIED: érvénytelen account."
                .to_string(),
        );
    }

    Ok(())
}

fn validate_secret(
    secret: &str,
) -> Result<(), String> {
    if secret.trim() != secret {
        return Err(
            "CREDENTIAL_SECRET_WHITESPACE: a token nem kezdődhet vagy végződhet szóközzel."
                .to_string(),
        );
    }

    let bytes = secret.len();

    if bytes < MIN_SECRET_BYTES {
        return Err(
            "CREDENTIAL_SECRET_TOO_SHORT: a token túl rövid."
                .to_string(),
        );
    }

    if bytes > MAX_SECRET_BYTES {
        return Err(
            "CREDENTIAL_SECRET_TOO_LONG: a token túl hosszú."
                .to_string(),
        );
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

    #[allow(unreachable_code)]
    "unsupported"
}

fn backend_name() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        return "macOS Keychain";
    }

    #[cfg(target_os = "windows")]
    {
        return "Windows Credential Manager";
    }

    #[cfg(target_os = "linux")]
    {
        return "Linux Secret Service";
    }

    #[allow(unreachable_code)]
    "Unsupported credential store"
}

fn unsupported_status() -> CredentialStatus {
    CredentialStatus {
        supported: false,
        available: false,
        backend:
            backend_name().to_string(),
        platform:
            platform_name().to_string(),
        service:
            ALLOWED_SERVICE.to_string(),
        account:
            ALLOWED_ACCOUNT.to_string(),
        present: None,
        error_code: Some(
            "CREDENTIAL_STORE_UNSUPPORTED"
                .to_string(),
        ),
    }
}

#[cfg(any(
    target_os = "macos",
    target_os = "windows",
    target_os = "linux"
))]
mod desktop {
    use super::{
        backend_name,
        platform_name,
        CredentialStatus,
        ALLOWED_ACCOUNT,
        ALLOWED_SERVICE,
    };

    use keyring::{
        Entry,
        Error as KeyringError,
    };

    use zeroize::Zeroizing;

    fn create_entry() -> Result<Entry, String> {
        Entry::new(
            ALLOWED_SERVICE,
            ALLOWED_ACCOUNT,
        )
        .map_err(
            |_| {
                "CREDENTIAL_ENTRY_ERROR: a natív kulcstár-bejegyzés nem hozható létre."
                    .to_string()
            },
        )
    }

    fn operation_error(
        operation: &str,
        error: KeyringError,
    ) -> String {
        match error {
            KeyringError::NoEntry => {
                format!(
                    "CREDENTIAL_NO_ENTRY: {operation}"
                )
            }
            _ => {
                format!(
                    "CREDENTIAL_STORE_ERROR: {operation}"
                )
            }
        }
    }

    async fn blocking<T, F>(
        operation: F,
    ) -> Result<T, String>
    where
        T: Send + 'static,
        F: FnOnce() -> Result<T, String>
            + Send
            + 'static,
    {
        tauri::async_runtime::spawn_blocking(
            operation,
        )
        .await
        .map_err(
            |_| {
                "CREDENTIAL_TASK_ERROR: a natív kulcstárfeladat megszakadt."
                    .to_string()
            },
        )?
    }

    pub async fn status() -> CredentialStatus {
        let result =
            blocking(
                || {
                    let entry =
                        create_entry()?;

                    match entry.get_password() {
                        Ok(password) => {
                            let _password =
                                Zeroizing::new(
                                    password,
                                );

                            Ok(true)
                        }
                        Err(
                            KeyringError::NoEntry,
                        ) => Ok(false),
                        Err(error) => Err(
                            operation_error(
                                "status",
                                error,
                            ),
                        ),
                    }
                },
            )
            .await;

        match result {
            Ok(present) => CredentialStatus {
                supported: true,
                available: true,
                backend:
                    backend_name()
                        .to_string(),
                platform:
                    platform_name()
                        .to_string(),
                service:
                    ALLOWED_SERVICE
                        .to_string(),
                account:
                    ALLOWED_ACCOUNT
                        .to_string(),
                present: Some(present),
                error_code: None,
            },
            Err(error) => CredentialStatus {
                supported: true,
                available: false,
                backend:
                    backend_name()
                        .to_string(),
                platform:
                    platform_name()
                        .to_string(),
                service:
                    ALLOWED_SERVICE
                        .to_string(),
                account:
                    ALLOWED_ACCOUNT
                        .to_string(),
                present: None,
                error_code: Some(
                    error
                        .split(':')
                        .next()
                        .unwrap_or(
                            "CREDENTIAL_STORE_ERROR",
                        )
                        .to_string(),
                ),
            },
        }
    }

    pub async fn get()
        -> Result<Option<String>, String>
    {
        blocking(
            || {
                let entry =
                    create_entry()?;

                match entry.get_password() {
                    Ok(password) => {
                        Ok(Some(password))
                    }
                    Err(
                        KeyringError::NoEntry,
                    ) => Ok(None),
                    Err(error) => Err(
                        operation_error(
                            "get",
                            error,
                        ),
                    ),
                }
            },
        )
        .await
    }

    pub async fn set(
        secret: String,
    ) -> Result<(), String> {
        blocking(
            move || {
                let entry =
                    create_entry()?;

                let secret =
                    Zeroizing::new(
                        secret,
                    );

                entry
                    .set_password(
                        secret.as_str(),
                    )
                    .map_err(
                        |error| {
                            operation_error(
                                "set",
                                error,
                            )
                        },
                    )
            },
        )
        .await
    }

    pub async fn delete()
        -> Result<bool, String>
    {
        blocking(
            || {
                let entry =
                    create_entry()?;

                match entry
                    .delete_credential()
                {
                    Ok(()) => Ok(true),
                    Err(
                        KeyringError::NoEntry,
                    ) => Ok(false),
                    Err(error) => Err(
                        operation_error(
                            "delete",
                            error,
                        ),
                    ),
                }
            },
        )
        .await
    }
}

#[tauri::command]
pub async fn credential_status(
    service: String,
    account: String,
) -> Result<CredentialStatus, String> {
    validate_scope(
        &service,
        &account,
    )?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux"
    ))]
    {
        return Ok(
            desktop::status().await,
        );
    }

    #[allow(unreachable_code)]
    Ok(unsupported_status())
}

#[tauri::command]
pub async fn credential_get(
    service: String,
    account: String,
) -> Result<Option<String>, String> {
    validate_scope(
        &service,
        &account,
    )?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux"
    ))]
    {
        return desktop::get().await;
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
    validate_scope(
        &service,
        &account,
    )?;

    validate_secret(
        &secret,
    )?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux"
    ))]
    {
        return desktop::set(
            secret,
        )
        .await;
    }

    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[tauri::command]
pub async fn credential_delete(
    service: String,
    account: String,
) -> Result<bool, String> {
    validate_scope(
        &service,
        &account,
    )?;

    #[cfg(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux"
    ))]
    {
        return desktop::delete().await;
    }

    #[allow(unreachable_code)]
    Err(
        "CREDENTIAL_STORE_UNSUPPORTED: ezen a platformon nincs támogatott natív kulcstár."
            .to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::{
        validate_scope,
        validate_secret,
        ALLOWED_ACCOUNT,
        ALLOWED_SERVICE,
        MAX_SECRET_BYTES,
    };

    #[test]
    fn only_fixed_scope_is_allowed() {
        assert!(
            validate_scope(
                ALLOWED_SERVICE,
                ALLOWED_ACCOUNT,
            )
            .is_ok()
        );

        assert!(
            validate_scope(
                "other-service",
                ALLOWED_ACCOUNT,
            )
            .is_err()
        );

        assert!(
            validate_scope(
                ALLOWED_SERVICE,
                "other-account",
            )
            .is_err()
        );
    }

    #[test]
    fn secret_length_and_whitespace_are_checked() {
        assert!(
            validate_secret(
                "0123456789abcdef",
            )
            .is_ok()
        );

        assert!(
            validate_secret(
                " short-secret "
            )
            .is_err()
        );

        assert!(
            validate_secret(
                "too-short",
            )
            .is_err()
        );

        assert!(
            validate_secret(
                &"x".repeat(
                    MAX_SECRET_BYTES + 1,
                ),
            )
            .is_err()
        );
    }
}
