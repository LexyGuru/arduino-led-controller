# Beta.4 Native App Self-Updater + Signed Release Pipeline Foundation

Target application: `5.5.1-beta.4`

This layer supersedes the Beta.3 decision to defer native application self-update installation while preserving the Beta.3 OTA2 firmware path.

Desktop-only updater targets: macOS, Windows and Linux. Android/iOS remain outside this updater path.

## Trust model

The Tauri updater public key is embedded in `tauri.conf.json`. The matching private key and password are never stored in the repository and are supplied to GitHub Actions only via:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Runtime path

`App Update Center -> tauriApi.invoke -> Rust tauri-plugin-updater`

The native Beta update path checks the signed feed, downloads the updater artifact, performs mandatory signature verification, installs the update, then restarts the application.

The existing external GitHub release/download fallback remains available when the native Beta desktop updater path is not active.

## Beta feed

`https://github.com/LexyGuru/arduino-led-controller/releases/download/updater-beta/latest.json`

The workflow maintains an `updater-beta` GitHub release alias containing `latest.json`. The manifest points to the versioned prerelease artifacts and embeds the contents of the generated `.sig` files.

Platforms:

- `linux-x86_64`
- `windows-x86_64`
- `darwin-aarch64`
- `darwin-x86_64`

## Preserved contracts

- firmware `5.0.0-beta.9`
- Direct API `1.0.0`
- firmware source unchanged
- OTA2 unchanged
- schedule persistence unchanged
- existing GitHub version detection preserved
- external download/release fallback preserved
- Beta.4 visual layers preserved
