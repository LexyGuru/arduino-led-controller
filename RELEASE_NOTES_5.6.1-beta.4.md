# Arduino LED Controller 5.6.1-beta.4

## Release identity
- Application: `5.6.1-beta.4`
- Branch: `next/v5-rearchitecture`
- Channel: Beta
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`

## P1 — Release Runner Resilience
Beta.4 starts P1 after completion of the P0 architecture consolidation. The first P1 objective is to make application build/release execution fail-fast and recover predictably instead of hanging indefinitely on Linux package installation.

### Shared Linux/Tauri dependency installer
All canonical application workflows use `scripts/ci/install-linux-tauri-deps.sh` with noninteractive APT, acquisition retries/timeouts, dpkg lock timeout, bounded GNU `timeout`, retry diagnostics and a 15-minute workflow step timeout.

### Canonical workflow coverage
Hardening covers `app-build.yml`, `app-staging-build.yml`, Beta validate/Linux desktop, and Stable validate/Linux desktop. Raw duplicated Tauri APT blocks are removed.

### Why Beta.4
The `5.6.1-beta.3` Application Beta release stalled abnormally in `Install Linux system dependencies` before version validation or regression. Beta.4 makes that external step bounded and diagnosable.

## P0 status
P0 remains complete: release/version SSOT, version/channel aware current tests, separated history audit, Device Key forward-sync, and release versioning policy remain active.

## Firmware
Firmware remains `5.0.0-beta.10`; firmware source is unchanged. Direct API remains `1.0.0`.
