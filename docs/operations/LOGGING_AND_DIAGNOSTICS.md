# Logging & diagnostics operations

## Desktop / iOS / iPadOS / Android

A Tauri log root az alkalmazás saját `app_data_dir/logs` könyvtára. A pontos runtime útvonal a `diagnostic_log_paths` Tauri commanddal kérdezhető le. Mobilon a fájlok az alkalmazás sandboxjában maradnak.

## LXC

A log root `<RUNTIME_DATA_DIR>/logs/`, benne legalább `app/` és `errors/`. A systemd/journal megmaradhat párhuzamos forrásként.

## OTA

Minden UI-ban megjelenő OTA progress esemény tartósan bekerül az `ota` kategóriába. Credential nem kerülhet a fájlba.

## Hibajelentés minimum

App verzió, platform, érintett app/error/ota log, firmware verzió és bootGeneration ha releváns, valamint az esemény időpontja.

## Tauri dialog confirm permission

A Beta.3 desktop runtime logging egy valódi frontend hibát fogott meg:

`UNHANDLED_REJECTION: dialog.confirm not allowed. Command not found`

A Tauri dialog plugin inicializálva van, de a frontend parancsot capability
permissionnel is engedélyezni kell. A V394 a releváns capability-ben explicit
engedélyezi:

- `dialog:allow-message`
- `dialog:allow-confirm`

A `dialog:allow-confirm` Tauri v2-ben kompatibilitási alias, ezért az
`allow-message` permission is megmarad.
