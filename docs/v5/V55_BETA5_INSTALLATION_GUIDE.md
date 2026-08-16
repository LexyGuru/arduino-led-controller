# V5.5 Beta.5 Installation Guide

Application version: `5.5.1-beta.5`  
Firmware version: `5.0.0-beta.10`

## Development candidate
This document currently describes the locally validated Beta.5 development
candidate. Do not publish until the full test chain and explicit user approval.

## Desktop
Use the normal development workflow. Existing Direct API, OTA credentials,
Theme Engine 2.5 settings and Update System 2.0 configuration are preserved.

## Mobile
Beta.5 includes the viewport-owned mobile shell with persistent BottomNav and
safe-area handling. Verify portrait and landscape behavior before publication.

## Arduino
Beta.5 pairs the application with firmware `5.0.0-beta.10`. The firmware source
was extended by V571E with schedule transaction progress diagnostics; Direct API
remains `1.0.0`.

## LXC
LXC/web version metadata is aligned to `5.5.1-beta.5`; runtime behavior remains
unchanged.

## Validation
Require focused Dashboard contracts, version/document parity, frontend build,
full `npm test` (19 CURRENT + 22 REGRESSION), repository validation, Rust
check/test, unchanged Beta.5 firmware source during release closure and unchanged
stable `main`.

Runtime validation for this candidate also covers:
- V571E schedule-save progress visibility and persistent result state.
- V572A Device Health timestamp normalization; missing errors render `—` and
  native network-log timestamps no longer produce epoch-sized ages.
