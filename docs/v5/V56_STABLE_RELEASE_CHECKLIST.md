# Arduino LED Controller 5.6.1 — final Stable checklist

## Versions
- Application: `5.6.1`
- Firmware: `5.0.0`
- Direct API: `1.0.0`

## Consolidation
- [ ] Current MAIN-only Stable fixes are preserved.
- [ ] Beta.6 P0/P1 changes are preserved.
- [ ] Stable application metadata points to `main` / `updater-stable`.
- [ ] Stable firmware metadata points to firmware `5.0.0`.
- [ ] Firmware source reports `5.0.0`.

## Regression
- [ ] release policy passes
- [ ] release architecture passes
- [ ] Stable workflow architecture passes
- [ ] release asset contract passes
- [ ] Linux runner resilience passes
- [ ] macOS OTA immutable contract passes
- [ ] full npm regression passes
- [ ] repository validation passes
- [ ] desktop frontend build passes
- [ ] Rust check/test passes
- [ ] UNO R4 firmware compile passes

## Runtime after publication
- [ ] Application Stable release workflow succeeds.
- [ ] `v5.6.1` is a non-prerelease and latest Stable release.
- [ ] `updater-stable` points to `5.6.1`.
- [ ] Firmware Stable release workflow succeeds.
- [ ] Stable firmware catalog exposes `5.0.0` only.
