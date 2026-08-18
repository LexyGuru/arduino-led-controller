# Beta.3 OTA2 Live TypeScript Recovery

V503 failed in the candidate fast gate before touching the real worktree.

Root cause:
`ota2RuntimeState.d.mts` exposed runtime state as `Record<string, unknown>`.
React therefore saw `ota2Runtime.stage`, `ota2Runtime.code`, and
`ota2Runtime.progress` as `unknown`, producing TS2322 in FirmwarePage JSX.

V504 reapplies the V503 live UI/runtime integration on the still-clean V502
tested dirty base, while replacing the generic declaration layer with concrete
OTA2 runtime, native bridge, live policy, and live controller types.

No runtime semantics are weakened.
No version bump.
Firmware source unchanged.
No commit/push.
