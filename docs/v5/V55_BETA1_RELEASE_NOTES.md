# V5.5 Beta.1 Release Notes — 5.5.0-beta.1

This is a GitHub **prerelease** from `next/v5-rearchitecture`; stable `main` is not modified by the Beta release workflow.

Application: `5.5.0-beta.1`
Firmware: `5.0.0-beta.7`
Direct API: `1.0.0`

## V5.5 generation

- Theme Engine 2.0
- Core UI 1.5
- Dashboard 2.0
- Statistics 1.0
- Activity & Logs 2.0
- Management UI 2.0
- App Update Center 1.0
- shared React frontend for desktop, mobile and LXC
- LXC native Tauri runtime isolation

## Release integrity

The application prerelease contains application/mobile/LXC artifacts only. Arduino UNO R4 WiFi firmware is handled by the dedicated firmware prerelease workflow.

Release evidence includes `SHA256SUMS`, `SBOM.cdx.json`, `PROVENANCE.json` and `SECRET-SCAN.json`.

The production Arduino target `10.0.0.123` remains blocked by default in staging.

V5.5 starts at `5.5.0-beta.1`, above stable application `5.0.0`.
