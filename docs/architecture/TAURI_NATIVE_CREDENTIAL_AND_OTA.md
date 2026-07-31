# Tauri native credential and OTA integration

- The connection JSON contains no serialized `arduinoApiKey`.
- Device keys use `direct:<profile>:device-key` in the native credential store.
- OTA passwords use `direct:<profile>:ota-password`.
- Startup migration moves the legacy JSON key and `ota-secret.txt` into the native store and removes plaintext persistence.
- The Rust backend consumes editable API/OTA hosts, ports, uploader mode/path, timeout, and stable/beta channel settings.
- Existing firmware download, SHA-256 verification, OTA prepare, local arduinoOTA execution, progress events, reboot checks, and schedule persistence checks remain the authoritative installation path.
