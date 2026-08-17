# Workflow Architecture

Canonical workflows:
- `app-beta-release.yml`
- `app-stable-release.yml`
- `firmware-beta-release.yml`
- `firmware-stable-release.yml`
- `app-build.yml`
- `firmware-build.yml`

Application and firmware releases are independent lifecycles.

## Stable application pipeline

`app-build.yml` owns all application build jobs and uploads application artifacts.

`app-stable-release.yml` validates `main` / Stable channel identity, calls `app-build.yml`, collects its artifacts and owns Stable GitHub Release publication.

`tauri-desktop.yml` is now a manual compatibility wrapper that delegates to `app-stable-release.yml`; it no longer contains build/release implementation and has no automatic `push` trigger.

Stable application release explicitly rejects firmware assets.

## Remaining migration

The historical Stable pipeline did not provide the same signed Tauri updater feed contract as the Beta pipeline. `updater-stable` signed-feed publication is therefore intentionally deferred to the next dedicated updater-signing migration rather than being synthesized incorrectly.
