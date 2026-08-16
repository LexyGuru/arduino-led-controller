# Beta.4 Firmware / OTA2 / Update Center Modern Glass Redesign

Base remote commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

## Scope

Presentation-only modernization of:

- Firmware page command-center heading
- Update Center application/firmware cards
- installed vs available version presentation
- Stable/Beta channel badges
- Arduino / OTA / backup readiness states
- firmware support status cards
- legacy realtime OTA progress and console
- OTA2 operation progress, blockers, cancel state and recent history
- external `.bin` install panel
- channel-aware firmware restore catalog

## Protected functional contracts

V525 does not change:

- `useV5Firmware`
- `runUpdateCenterCheckBoth`
- `buildUpdateCenterPanelModel`
- application update relation logic
- firmware update relation / downgrade guards
- OTA2 live install controller
- schedule backup recovery coordinator
- artifact / checksum handling
- OTA2 safe cancellation rules
- audited install flow
- native external firmware installation
- post-install refresh
- restore/reinstall/update mode selection
- operation history semantics

## Dirty-state workflow

V525 inherits the proven dynamic snapshot pipeline:

1. capture current tracked binary diff
2. capture all untracked files
3. build SHA-256 content manifest
4. replay exact state into detached candidate
5. verify manifest
6. only then attach dependency symlinks
7. apply V525
8. focused + full regression
9. verify real state did not change during candidate
10. apply to real worktree
