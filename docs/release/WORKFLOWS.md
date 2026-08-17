# Workflow Architecture

Canonical workflows:
- app-beta-release.yml
- app-stable-release.yml
- firmware-beta-release.yml
- firmware-stable-release.yml
- app-build.yml
- firmware-build.yml

Application and firmware releases are independent. Application release workflows MUST NOT automatically dispatch firmware releases.

`beta-release.yml` remains a temporary compatibility entry and is application-only. Stable artifact publishing remains on historical `tauri-desktop.yml` until the next migration phase. Stable firmware release is blocked while no Stable firmware is explicitly promoted.
