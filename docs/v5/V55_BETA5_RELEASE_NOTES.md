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
Firmware source is modified by V571E schedule-save progress diagnostics. Paired firmware candidate: `5.0.0-beta.10`.

## Stable branch
`main` is not modified by this Beta.5 development candidate.

## V571E schedule-save progress diagnostics

- Native Rust schedule-save progress events expose real upload current/total.
- Commit, verification and readback phases are visible without fake percentages.
- Persistent success/error state includes revision, checksum and duration.
- Firmware transaction diagnostics expose transaction id, total, received and generation.

## V572A telemetry timestamp normalization

- Device Health normalizes JavaScript millisecond and Rust UNIX-second timestamps.
- Missing or invalid timestamps render `—` instead of epoch-sized ages.
- `test:telemetry-timestamp-normalization` is a permanent REGRESSION contract.
- Default Test Architecture V2 closure: 19 CURRENT + 22 REGRESSION tests.
