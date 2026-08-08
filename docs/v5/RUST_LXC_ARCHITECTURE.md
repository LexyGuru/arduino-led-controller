# Rust LXC architecture – Shared Core Phase 2

## Alapelv

A desktop Tauri adapter és a headless LXC szerver ugyanazt a
`rust/arduino-led-core` Direct API HTTP transportot használja.

Az Arduino marad az autonóm scheduler és az eszközállapot autoritatív forrása.

## LXC API

Health:
- `GET /health/live`
- `GET /health/ready`

Direct Arduino gateway:
- `GET /api/v1/status`
- `GET /api/v1/logs?afterId=N`
- `PUT /api/v1/leds/{id}`
- `PUT /api/v1/time/config`
- `GET /api/v1/schedules/status`
- `GET /api/v1/schedules?offset=N&limit=N`
- `DELETE /api/v1/schedules`
- schedule transaction start/chunk/commit/abort
- `GET /api/v1/ota/status`
- `POST /api/v1/ota/prepare`

LXC saját szolgáltatások:
- `GET /api/v1/server/firmware/catalog`
- `WS /api/v1/events/ws`

## Firmware OTA

Phase 2-ben az LXC az Arduino OTA előkészítési és státusz API-ját közvetíti.
A desktop bizonyított OTA bináris-feltöltési logikáját még nem duplikáljuk.
A teljes headless OTA upload a következő fázis feladata.

## Deploy

A bundle verziózott `/opt/arduino-led-controller/releases/<version>`
könyvtárat használ, `current` és `previous` symlinkkel. A rollback csak
a symlinket váltja vissza, majd újraindítja a systemd service-t.

## Phase 3 – valódi LXC runtime validáció

A macOS-on fordított bináris nem tekinthető LXC release artifactnak.
Valódi Debian/Proxmox LXC tesztkor a source runtime-test bundle-t kell
a konténerre másolni, ahol `install-rust-lxc-native.sh` Linuxon natívan
fordít ELF binárist.

Runtime gate:
- live / ready
- Arduino status
- schedules
- logs
- OTA status
- firmware catalog
- WebSocket event stream
- systemd restart/persistence
- rollback, ha van previous release

A végleges GitHub release LXC artifactot Linux CI runnernek kell buildelnie.
