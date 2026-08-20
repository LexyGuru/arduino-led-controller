# Arduino LED Controller 5.7.0-beta.3 — Release Notes

## Firmware channel resolver hotfix
- Fixes the OTA install path so the selected firmware update channel is authoritative end-to-end.
- `STABLE` firmware installs resolve only Stable firmware artifacts.
- `BETA` firmware installs resolve only Beta firmware artifacts.
- Removes the Beta-only release resolver from the requested-version OTA install path.
- Preserves native Rust OTA, macOS Terminal fallback, fresh LAN target resolution, and Direct API confirmation behavior.
- Firmware remains `5.0.0` Stable.
- Direct API remains `1.0.0`.
- Theme Engine remains `2.0`.
- Core UI remains `3.0`.
