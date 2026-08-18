# Multi-Platform Diagnostics & Logging v1

**Application:** `5.5.0-beta.3`
**Firmware:** `5.0.0-beta.9`
**Direct API:** `1.0.0`

## Scope

A Beta.3 egységes tartós naplózást vezet be Desktop (macOS/Windows/Linux), iOS/iPadOS, Android és LXC/Node.js runtime számára. Az OTA progress, frontend hibák és process-szintű LXC hibák is tartós fájlba kerülnek.

## Tauri / mobil

A Tauri backend ugyanazt a Rust logging core-t használja desktopon és mobilon. A logok az alkalmazás saját `app_data_dir/logs` sandboxában készülnek. Az OTA progress minden `emit_ota_progress()` eseménynél tartós `ota/current.jsonl` rekordot kap.

## Frontend

A React entrypoint naplózza az `APP_START`, `FRONTEND_ERROR` és `UNHANDLED_REJECTION` eseményeket.

## LXC

A Node.js control plane a runtime data könyvtár `logs/app` és `logs/errors` mappáiba ír napi fájlokat. Az `uncaughtExceptionMonitor` és `unhandledRejection` is bekerül az error logba.

## Rotation

- Tauri: 5 MiB/fájl, 5 rotált fájl/kategória.
- LXC: 10 MiB/fájl, 14 retention fájl.

## Titokvédelem

Device Key, OTA password, Authorization/Bearer token, API key, token/secret/password mező nem kerülhet nyersen logba; `[REDACTED]` vagy teljes üzenet-redaction történik.

## Verziók

`Application=5.5.0-beta.3`, `Firmware=5.0.0-beta.9`, `Direct API=1.0.0`.
