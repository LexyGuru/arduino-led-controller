# Arduino LED Controller 5.6.1 — installation guide

## Release identity

- Application: `5.6.1` (Beta)
- Firmware Beta: `5.0.0`
- Direct API: `1.0.0`
- Source branch: `next/v5-rearchitecture`

The current Stable application on `main` is still `5.1.0`.
Stable `5.6.1` and Stable firmware `5.0.0` are promotion targets only after this Beta has passed release QA.

## Install the Beta application

Use the assets attached to the `5.6.1` GitHub prerelease.
Do not use Stable assets to test the Beta runtime.

Supported application targets:
- macOS Apple Silicon
- macOS Intel
- Windows x86_64
- Linux x86_64
- Android
- unsigned iOS/iPadOS artifact where applicable
- Debian 13 Rust LXC/shared web runtime

## Application update channel

Application Update Channel is a future-update selector:
- **Beta** checks the Beta application catalog.
- **Stable** checks the Stable application catalog.

Changing this setting does not change the identity of the currently installed application.
A running `5.6.1` binary remains a Beta build even while it checks the Stable channel.

## Firmware update channel

Firmware Update Channel independently selects the firmware catalog:
- **Beta** lists Beta firmware such as `5.0.0`.
- **Stable** lists only Stable firmware.

Before `5.0.0` Stable firmware is promoted, the Stable list may be empty. This is expected and must not fall back to Beta artifacts.

## Startup diagnostics

- Normal background startup continuation must not be shown as a warning.
- Real startup degraded/error states remain available on Dashboard.
- The startup card is non-scrollable and fits the viewport.
- On healthy macOS connections, recovered first-run Keychain/bootstrap credential noise is not retained as Latest Error.

## Update Center visibility

If a newer application build is available, the Sidebar shows a persistent update card with the target version.
Selecting the card opens Settings / Update Center.

## Firmware OTA

The existing macOS OTA Beta.7 contract is frozen:
- native uploader is preferred;
- Terminal fallback remains available;
- LAN target behavior is preserved;
- post-flash Direct API confirmation may wait up to 180 seconds.

The firmware source is unchanged by the V5.6 application/workflow cleanup.

## LXC

Debian 13 Rust LXC uses the shared React frontend and the selected update channel.
Direct Arduino mode remains usable without LXC.

## Post-install Beta verification

1. Confirm the application reports `5.6.1` and Beta build identity.
2. Switch Application channel Beta → Stable → Beta.
3. Switch Firmware channel Beta → Stable and verify no Beta firmware appears.
4. Switch Firmware back to Beta and confirm `5.0.0`.
5. Restart and confirm saved channels remain effective.
6. Confirm the startup screen has no internal scrolling.
7. Confirm normal startup has no false warning state.
8. Confirm real startup problems appear on Dashboard.
9. Verify Update Center/sidebar update visibility when an update exists.
10. Verify OTA on macOS before approving Stable promotion.

## Release separation

Application and firmware releases are separate manual workflows.
Publishing the Beta application does not automatically publish firmware and does not modify `main`.

## Stable Device Key verification

Verify `/api/v1/status` on both configured local and remote/DDNS Arduino targets.
A valid 16–64 character printable-ASCII Device Key must be accepted by the Direct API transport.
