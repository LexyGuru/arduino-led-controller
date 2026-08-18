# Arduino LED Controller 5.6.1 — Stable installation guide

## Release identity
- Application: `5.6.1`
- Application channel: `stable`
- Firmware: `5.0.0`
- Firmware channel: `stable`
- Direct API: `1.0.0`
- Source branch: `main`
- Updater alias: `updater-stable`

This release is the Stable promotion of the manually validated `5.6.1-beta.2` application and `5.0.0-beta.10` firmware candidates.

## Install the Stable application
Use the assets attached to the `v5.6.1` GitHub Stable release.

Supported targets:
- macOS Apple Silicon
- macOS Intel
- Windows x86_64
- Linux x86_64
- Android
- unsigned iOS/iPadOS artifact where applicable
- Debian 13 Rust LXC/shared web runtime

## Update channels
Application Update Channel selects the future application catalog only.
The installed `5.6.1` build remains Stable regardless of whether the future-update selector is Stable or Beta.

Firmware Update Channel independently selects Stable or Beta firmware catalogs.
Stable firmware catalog must never fall back to Beta artifacts.

## LXC
Stable Debian 13 Rust LXC uses production metadata:
- install root: `/opt/arduino-led-controller`
- service: `arduino-led-controller-rust.service`
- channel: `stable`

Release installation assets:
- `install-rust-lxc-native.sh`
- `rust-lxc.env.example`

## Firmware OTA
The historical macOS OTA Beta.7 immutable implementation contract remains frozen:
- native uploader preferred
- Terminal fallback preserved
- LAN target behavior preserved
- post-flash Direct API confirmation up to 180 seconds

## Stable Device Key
Valid Device Key range is 16–64 printable ASCII characters.
Whitespace, control characters and non-header-safe values remain rejected.

## Post-install Stable verification
1. Application reports `5.6.1` Stable.
2. Firmware reports `5.0.0` Stable.
3. Arduino Direct API connects successfully.
4. LED control and schedules work.
5. Update Center uses `updater-stable`.
6. Stable firmware catalog contains no Beta artifacts.
7. Stable LXC runtime works where used.
