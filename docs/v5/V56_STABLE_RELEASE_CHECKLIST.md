# Arduino LED Controller 5.6.1 — Stable release checklist

## Identity
- [x] VERSION is `5.6.1`
- [x] application channel is `stable`
- [x] application release branch is `main`
- [x] updater alias is `updater-stable`
- [x] firmware is `5.0.0`
- [x] firmware channel is `stable`
- [x] Direct API is `1.0.0`

## Automated gates
- [x] full current suite
- [x] full default regression
- [x] repository validation
- [x] desktop frontend build
- [x] Rust check/test
- [x] immutable macOS OTA contract
- [x] Stable LXC archive and checksum
- [x] Stable LXC production metadata
- [x] Stable LXC installer/updater channel routing

## Manual runtime QA
- [x] Stable Tauri application launches
- [x] Arduino connection works
- [x] Latest Error is clear on healthy connection
- [x] LED control works
- [x] schedules load
- [x] Stable application identity verified
- [x] Stable firmware identity verified

## Publication
- [ ] Application Stable workflow succeeds on `main`
- [ ] `v5.6.1` is non-prerelease and latest
- [ ] `updater-stable` feed is published
- [ ] application release contains no firmware binaries
- [ ] Firmware Stable workflow succeeds separately
- [ ] Stable firmware `5.0.0` is published
- [ ] NEXT remains unchanged
