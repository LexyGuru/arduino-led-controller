# Beta.3 OTA2 Live UI + Runtime Integration Mega

V503 binds the catalog install action to the OTA2 live controller.

Frontend-proven gates:
- Arduino online
- OTA configured
- backup configured
- artifact download URL present
- checksum URL present
- no metadata conflict
- semantic relation classifies update/reinstall/restore

Native-delegated authoritative gates:
- Direct API readiness
- OTA target reachability
- actual downloaded binary SHA-256 verification

The existing Rust/LXC installer remains the destructive executor. V503 does not
introduce a duplicate upload/download.

Live UI state displays:
OTA2 • STAGE • X-code • progress
and the final controller result code.

No version bump. Firmware source unchanged. No commit/push.
