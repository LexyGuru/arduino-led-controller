# Arduino LED Controller 5.7.0-beta.5 — Release Notes

## Beta.5 — OTA2 unification and reliable completion

- The duplicate legacy OTA user-facing pipeline has been removed; OTA2 is now the single canonical firmware update experience.
- The working low-level OTA engine remains intact: native Rust OTA, macOS Terminal fallback and Direct API reboot confirmation are preserved.
- Successful catalog OTA now emits an explicit final `Kész / success / 100%` event after reboot and schedule-persistence verification.
- OTA2 runtime and UX guarantee terminal `SUCCESS / 100%` after successful post-verification, eliminating the previous 98% completion stall.
- The active Visual 3.1 firmware contract was migrated from the removed legacy OTA pipeline to the canonical OTA2 surface.
- Firmware remains `5.0.1-beta.1` Beta; this application release does not change firmware source.
- Direct API `1.0.0`, Theme Engine `2.0`, Core UI `3.0`.
