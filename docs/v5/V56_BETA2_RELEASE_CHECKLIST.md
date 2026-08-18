# Arduino LED Controller 5.6.1-beta.2 — release checklist

## Identity and branch

- [ ] `VERSION` is `5.6.1-beta.2`
- [ ] application/package/Tauri/LXC versions are synchronized to `5.6.1-beta.2`
- [ ] `release-versions.json` application channel is Beta and branch is `next/v5-rearchitecture`
- [ ] firmware remains `5.0.0-beta.10`
- [ ] Direct API remains `1.0.0`
- [ ] `main` remains unchanged before Beta publication
- [ ] current Stable application on `main` is documented as `5.1.0`, not `5.6.1`
- [ ] Stable firmware is documented as unavailable until explicit promotion

## Canonical GitHub Actions

- [ ] exactly seven canonical workflow files exist
- [ ] `app-build.yml`
- [ ] `app-staging-build.yml`
- [ ] `app-beta-release.yml`
- [ ] `app-stable-release.yml`
- [ ] `firmware-build.yml`
- [ ] `firmware-beta-release.yml`
- [ ] `firmware-stable-release.yml`
- [ ] `beta-release.yml` is absent
- [ ] `tauri-desktop.yml` is absent
- [ ] `tauri-artifact-build.yml` is absent
- [ ] App Beta release is prerelease-only and NEXT-only
- [ ] App Stable release is main-only, non-prerelease and self-contained
- [ ] Firmware Beta and Stable release workflows reuse `firmware-build.yml`
- [ ] no application workflow automatically dispatches a firmware release

## Automated gates

- [ ] `npm test`
- [ ] `npm run validate`
- [ ] desktop frontend build passes
- [ ] Rust `cargo check --locked` passes
- [ ] immutable macOS OTA Beta.7 contract passes
- [ ] workflow architecture contracts pass
- [ ] `git diff --check` passes
- [ ] firmware source hash is unchanged

## Manual runtime QA

- [ ] running application build identity remains Beta
- [ ] Application Update Channel Beta → Stable → Beta changes only the selected catalog
- [ ] Firmware Update Channel Beta → Stable never leaks Beta firmware into Stable
- [ ] Firmware Update Channel Stable → Beta restores the Beta catalog
- [ ] channel settings persist across restart
- [ ] normal startup shows no false warning icons
- [ ] startup card does not scroll
- [ ] real startup warning/error remains visible on Dashboard
- [ ] recovered healthy macOS Keychain/bootstrap noise is not retained as Latest Error
- [ ] persistent real connection error remains visible
- [ ] Sidebar update card appears when an app update is available
- [ ] macOS OTA native/fallback/LAN/180-second confirmation behavior remains correct

## Beta publication

- [ ] documentation matches the released source state
- [ ] run `Application Beta release` from `next/v5-rearchitecture`
- [ ] release uses `5.6.1-beta.2`
- [ ] GitHub release is a prerelease and not latest Stable
- [ ] installers/updater/mobile/LXC artifacts are present as expected
- [ ] install the published Beta artifact and repeat the critical runtime QA above

## Stable promotion gate

Do not promote to `main` until every Beta publication and manual installation item above passes.

After Beta acceptance:
- [ ] prepare application Stable `5.6.1`
- [ ] prepare firmware Stable `5.0.0`
- [ ] switch release metadata to Stable/main/updater-stable
- [ ] rerun the full Stable regression and release gates
- [ ] only then commit/push/promote to `main`

## Beta.2 Device Key gate

- [ ] valid 16-character printable-ASCII Device Key reaches `/api/v1/status`
- [ ] 15-character Device Key remains rejected
- [ ] leading/trailing whitespace remains rejected
- [ ] control/non-ASCII header values remain rejected
- [ ] local HTTP and remote HTTPS/DDNS Direct API targets both work
- [ ] macOS, iOS/iPadOS and LXC/shared runtime smoke test completed
