# 5.6.1-beta.1 installation guide

## Beta application

Install the `5.6.1-beta.1` Beta application from the Beta release assets.

## Update channel

- Application update channel: Stable or Beta, independently selectable.
- Firmware update channel: Stable or Beta, independently selectable.
- The running build identity does not change merely by changing the update channel.

## Firmware

The Beta firmware channel uses `5.0.0-beta.10`.
Stable firmware is not substituted into the Beta channel.

## LXC

LXC/web deployments use the same application version contract and shared frontend assets.

## Safety

Stable `main` is not modified by installing or testing this Beta release.

## V619 live channel runtime correction

The running application build identity and the selected update channel are independent.

Expected behavior:
- `5.6.1-beta.1` always reports its running application build as **BETA**.
- Selecting Application Update Channel = **STABLE** immediately changes the application catalog/check target to Stable.
- Selecting Firmware Update Channel = **STABLE** immediately changes the firmware catalog heading and query to Stable.
- Stable firmware view must never show Beta firmware artifacts.
- Beta firmware view must never show Stable firmware artifacts.
- Until firmware `5.0.0` is actually promoted/published, the Stable firmware catalog may correctly be empty.
- The loading screen uses warning icons only for actual degraded/error states; ordinary background continuation is informational.

Manual pre-release QA:
1. Start `5.6.1-beta.1`.
2. Switch app channel Beta -> Stable -> Beta and verify the selected channel changes immediately.
3. Switch firmware channel Beta -> Stable and verify the heading becomes `Stable visszaállítási verziók`.
4. Confirm no `*-beta.*` firmware appears in Stable mode.
5. Switch back to Beta and verify the Beta catalog returns.
6. Restart the app after saving and repeat the channel checks.
7. Do not start a GitHub release until these UI checks pass.

## V623 canonical workflow architecture

Canonical GitHub Actions set:
- app-build.yml — application CI/build engine
- app-staging-build.yml — non-release staging artifacts
- app-beta-release.yml — explicit Beta application publisher
- app-stable-release.yml — explicit Stable application publisher
- firmware-build.yml — shared UNO R4 WiFi compile engine
- firmware-beta-release.yml — Beta firmware catalog publisher using firmware-build.yml
- firmware-stable-release.yml — Stable firmware catalog publisher using firmware-build.yml

Removed legacy/overlapping workflows:
- beta-release.yml
- tauri-desktop.yml
- tauri-artifact-build.yml (renamed to app-staging-build.yml)

Release workflows remain workflow_dispatch-only. No release is dispatched by this cleanup.
