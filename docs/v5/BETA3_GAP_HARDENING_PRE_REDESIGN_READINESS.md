# Beta.3 Gap + Hardening / Pre-Redesign Readiness

V506 closes the main OTA2 safety gap before the redesign phase.

## Added
- automatic schedule snapshot backup before every catalog update/reinstall/restore
- retry only for read-only schedule snapshot acquisition (3 attempts, exponential bounded backoff)
- backup write is never automatically retried
- controller-level single-flight guard in addition to the V505 UI lock
- diagnostics secret scrubber for password/token/key/bearer/query-secret material
- pre-redesign readiness model
- source contracts proving native SHA/cache/post-flash/persistence/cancel behavior

## Existing native behavior verified
The Rust OTA path already downloads the firmware and checksum, verifies SHA-256 over actual bytes, re-reads and verifies the persisted cache, uploads once, waits for Direct API confirmation, and checks schedule revision/checksum after reboot.

## Explicitly deferred
Native application self-update installation is not claimed complete. The repository detects available app releases, but the current Cargo dependency set does not include tauri-plugin-updater. This remains a post-redesign/pre-release task.

No version bump. Firmware source unchanged. No commit/push.
