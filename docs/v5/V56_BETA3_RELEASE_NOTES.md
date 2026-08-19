# Arduino LED Controller 5.6.1-beta.3

## Release identity

- Application: `5.6.1-beta.3`
- Branch: `next/v5-rearchitecture`
- Application channel: Beta
- Firmware: `5.0.0-beta.10`
- Firmware channel: Beta
- Direct API: `1.0.0`
- Board: `arduino:renesas_uno:unor4wifi`
- OTA port: `65280`
- Current Stable application on `main`: `5.1.0`
- Stable firmware is not published yet; planned promotion target remains `5.0.0`

## Beta.3 — P0 architecture consolidation

This release integrates the P0 architecture consolidation into a versioned Beta release surface.

### Release/version single source of truth

- `release-versions.json` is the canonical application release identity.
- `VERSION`, npm packages/lockfiles, Tauri, Cargo, LXC, OpenAPI and the shared TypeScript runtime are synchronized to `5.6.1-beta.3`.
- Beta release workflows derive application version, branch and channel from canonical release metadata instead of duplicating `EXPECTED_VERSION` / `EXPECTED_BRANCH` literals.
- The running application keeps Beta build identity independently from the selected update catalog.

### Test architecture consolidation

- Default `npm test` runs the current + regression architecture rather than the historical 198-test legacy chain.
- Historical release audits remain preserved and explicitly callable without blocking current release regression.
- Current release contracts are version-driven and channel-aware.
- Source-shape/whitespace-dependent release assertions were removed from current gates.
- Workflow cleanup tests validate SSOT semantics rather than duplicated YAML literals.

### Device Key forward-sync

- The Stable Device Key gate correction is forward-synced to Beta without importing Stable application identity.
- `X-Device-Key` remains the primary private Direct API authentication transport.
- Query-string key fallback remains disabled.
- Firmware, Node, Tauri and shared Rust core use the same channel-aware contract.
- Beta/Stable firmware channel crossover is explicitly rejected by tests.

## Release versioning policy

Every GitHub publication of application source is a new application version.

For a Beta publication this means:
1. bump the application version;
2. synchronize every canonical version surface;
3. create the matching root release notes and `docs/v5` release notes, installation guide and checklist;
4. update README, CURRENT_STATE and CHANGELOG;
5. run the full release regression before commit/push.

Firmware version is bumped only when firmware source/behavior changes. This release keeps firmware `5.0.0-beta.10` unchanged.

## Firmware and OTA

- Firmware remains `5.0.0-beta.10`.
- Firmware source is unchanged by this application/P0 release.
- Direct API remains `1.0.0`.
- The frozen macOS OTA Beta.7 contract remains intact.
- Native uploader → Terminal fallback, LAN target selection and post-flash Direct API confirmation remain protected.

## Canonical GitHub Actions architecture

Exactly seven workflows remain canonical:
- `app-build.yml`
- `app-staging-build.yml`
- `app-beta-release.yml`
- `app-stable-release.yml`
- `firmware-build.yml`
- `firmware-beta-release.yml`
- `firmware-stable-release.yml`

Application and firmware publishing remain separate manual workflows.

## Required Beta.3 QA

1. Launch the released `5.6.1-beta.3` application and verify Beta build identity.
2. Verify Application Update Channel Beta → Stable → Beta changes only the catalog target.
3. Verify Firmware Update Channel Stable never exposes Beta firmware.
4. Switch firmware channel back to Beta and verify `5.0.0-beta.10` is available.
5. Verify Direct API `X-Device-Key` local and remote/DDNS connectivity.
6. Verify startup diagnostics and persistent real-error visibility.
7. Verify Update Center detects a newer Beta by version.
8. Verify macOS OTA remains on the frozen production contract.
9. Verify shared desktop/mobile/LXC runtime starts with `5.6.1-beta.3`.
10. Only after the published Beta passes runtime QA may a later Stable promotion be prepared.

## Release policy

The Beta application release is manual (`workflow_dispatch`) and must be published from `next/v5-rearchitecture`.
`main` is not modified by this Beta release.
