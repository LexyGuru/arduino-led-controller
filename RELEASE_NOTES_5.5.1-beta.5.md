# Arduino LED Controller 5.5.1-beta.5 — Beta.5 Release Notes

## Release identity
- Application: `5.5.1-beta.5`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Channel: Beta / `next/v5-rearchitecture`
- Stable `main`: not modified

## Beta.5 focus
Beta.5 is the mobile/desktop usability and Overview consistency cycle built on the
Beta.4 functional foundation.

### Shared shell
- contract-safe mobile viewport shell with persistent bottom navigation
- compact portrait connection controls and safe-area handling
- desktop sidebar density/alignment cleanup
- Theme Engine card readability and contrast polish

### Dashboard / Overview
- one authoritative network-error source across Health and statistics
- real next-poll countdown based on `nextRetryAt`
- latest historical network failure fallback when active health error is cleared
- timeout-free HTTP rate naming instead of an unsupported generic success rate
- reduced duplication across hero, KPI, Device Health, Statistics and HTTP context
- consolidated System Health / telemetry block
- schedule and audit distributions remain separate historical views

### Theme Engine 2.5
Theme Engine 2.5 remains authoritative. Beta.5 improves readability without
changing theme persistence or theme identities.

### Update System 2.0
Update System 2.0 behavior is preserved.

## LXC
LXC/web application version metadata is aligned to `5.5.1-beta.5`; runtime
behavior is otherwise preserved.

## Firmware
Firmware source is modified by the V571E schedule-save progress diagnostics.
The paired Beta.5 firmware candidate is `5.0.0-beta.10`; Direct API remains `1.0.0`.

## Stable branch
`main` is not modified by this Beta.5 development candidate.

## V571E schedule-save progress diagnostics

- Native Rust schedule-save progress events with real chunk current/total.
- Visible commit, verification and readback phases without fake percentages.
- Persistent success/error result with revision, checksum and duration.
- Firmware schedule transaction diagnostics: id, total, received and generation.
- Paired firmware candidate: `5.0.0-beta.10`.

## V572A telemetry timestamp normalization

- Device Health accepts both JavaScript millisecond timestamps and native Rust
  network-log UNIX-second timestamps through one normalization contract.
- Invalid, zero, implausibly old and implausibly future timestamps display `—`
  instead of epoch-sized relative ages.
- The former `495858h`-class mixed-unit display regression is covered by the
  permanent `test:telemetry-timestamp-normalization` regression.
- Test Architecture V2 closes Beta.5 with 19 CURRENT and 22 REGRESSION tests in
  the default `npm test` chain.
