# Arduino LED Controller 5.6.1 — Stable

## Release identity
- Application: `5.6.1`
- Application channel: `stable`
- Branch: `main`
- Updater alias: `updater-stable`
- Firmware: `5.0.0`
- Firmware channel: `stable`
- Direct API: `1.0.0`
- Board: `arduino:renesas_uno:unor4wifi`
- OTA port: `65280`

## Promotion basis
This Stable release is promoted from the manually validated `5.6.1-beta.2` application and `5.0.0-beta.10` firmware candidates.

Stable promotion validation includes:
- full current and regression suites
- repository validation
- desktop frontend build
- Rust check/test
- immutable macOS OTA contract
- manual Tauri runtime smoke test
- Stable LXC archive, checksum and production metadata validation

## Device Key transport recovery
Credential storage and HTTP transport use the same Device Key contract:
- minimum 16 characters
- maximum 64 characters
- printable ASCII `0x21..0x7e`
- whitespace/control/non-header-safe values rejected

## Release/channel identity
Installed runtime identity and selected future update channel are separate.
The installed `5.6.1` application and `5.0.0` firmware identify as Stable.
Stable and Beta catalogs remain strictly separated.

## LXC Stable pipeline
Stable LXC packaging uses a dedicated Stable builder and production metadata.
Stable LXC firmware routing is channel-aware:
- Beta → `Arduino_LED_Controller_Firmware_BETA`
- Stable → `Arduino_LED_Controller_Firmware_STABLE`

## Release separation
The Application Stable release contains application, mobile and LXC assets only.
Firmware binaries are published separately by `firmware-stable-release.yml`.
