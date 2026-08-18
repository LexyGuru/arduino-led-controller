# Arduino LED Controller 5.6.1-beta.1

## Release identity

- Application: `5.6.1-beta.1`
- Branch: `next/v5-rearchitecture`
- Application channel: Beta
- Firmware: `5.0.0-beta.10`
- Firmware channel: Beta
- Direct API: `1.0.0`
- Board: `arduino:renesas_uno:unor4wifi`
- OTA port: `65280`
- Current Stable application on `main`: `5.1.0`
- Stable firmware is not published yet; planned promotion target after Beta acceptance: `5.0.0`

## What this Beta validates

V5.6 Beta.1 is the release/channel identity and runtime-behavior consolidation release.
It validates that installed build identity and selected update channel are separate concepts for both the application and firmware.

### Application channel behavior

- The running `5.6.1-beta.1` build always identifies itself as a Beta build.
- Selecting Application Update Channel = Stable changes only the update catalog/check target.
- Selecting Beta switches the update catalog/check target back to Beta.
- Changing the selected channel never rewrites the installed build identity.

### Firmware channel behavior

- Installed firmware identity is derived from the actual installed firmware version.
- Firmware Update Channel independently selects Stable or Beta catalog data.
- Stable mode never lists Beta firmware artifacts.
- Beta mode never lists Stable firmware artifacts.
- Before firmware `5.0.0` is promoted, an empty Stable firmware catalog is valid.

## Startup and diagnostics

- Ordinary background startup continuation is informational rather than a warning.
- Real startup degraded/error states remain visible on Dashboard after the startup screen closes.
- Recovered macOS first-run Keychain/bootstrap credential noise is suppressed from Latest Error only after the connection is healthy.
- Real persistent connection failures remain visible.
- The startup card is viewport-contained and does not create an internal scrollbar.

## Update visibility

When an application update is available:
- a persistent Sidebar update card displays the target version;
- the card opens Settings / Update Center;
- the existing Settings navigation dot remains as a secondary signal.

## Firmware and OTA

- Beta firmware remains `5.0.0-beta.10`.
- Firmware source was not changed by the V5.6 runtime/workflow cleanup.
- The frozen macOS OTA Beta.7 function-hash contract remains intact.
- Native uploader → Terminal fallback, LAN target selection and 180-second post-flash API confirmation remain locked.

## LXC and shared frontend

Desktop, mobile and Debian 13 Rust LXC continue to share the React frontend/version contract.
The Direct Arduino mode remains the primary no-server path; LXC remains optional.

## Canonical GitHub Actions architecture

Exactly seven workflows are canonical:
- `app-build.yml`
- `app-staging-build.yml`
- `app-beta-release.yml`
- `app-stable-release.yml`
- `firmware-build.yml`
- `firmware-beta-release.yml`
- `firmware-stable-release.yml`

Removed legacy workflows:
- `beta-release.yml`
- `tauri-desktop.yml`
- `tauri-artifact-build.yml`

`app-stable-release.yml` is now self-contained instead of delegating publishing to `tauri-desktop.yml`.
`firmware-beta-release.yml` reuses the common `firmware-build.yml` compile engine.

## Required Beta QA before Stable promotion

1. Launch the released `5.6.1-beta.1` application.
2. Verify the running build is shown as Beta.
3. Switch Application Update Channel Beta → Stable → Beta and verify the catalog target changes immediately.
4. Switch Firmware Update Channel Beta → Stable and confirm only Stable firmware is shown; an empty list is valid before promotion.
5. Switch Firmware Update Channel back to Beta and verify `5.0.0-beta.10` is available.
6. Restart after saving channel settings and repeat the checks.
7. Verify startup has no false warning icons and no startup-card scrolling.
8. Verify real startup warnings remain visible on Dashboard.
9. On macOS, verify recovered Keychain bootstrap noise does not remain as Latest Error after healthy connection.
10. Verify the persistent update card when an application update is available.
11. Verify firmware OTA still follows the frozen macOS OTA contract.
12. Only after the published Beta build passes these checks may `5.6.1` / firmware `5.0.0` Stable promotion to `main` begin.

## Release policy

Release workflows are manual (`workflow_dispatch`).
This Beta release must be published from `next/v5-rearchitecture`.
Stable `main` is not modified by the Beta release.
