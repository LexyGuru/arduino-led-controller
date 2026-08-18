# Beta.3 OTA2 Preflight Gate Foundation

V500 introduces the pure OTA2 preflight decision layer.

Required normal-update gates:
- Arduino/device online
- Direct API ready
- OTA configured
- OTA reachable
- backup store configured
- firmware artifact URL present
- SHA-256 metadata present and syntactically valid (64 hex)
- available firmware semantically newer than installed firmware

Stable preflight codes:
- X5100 ready
- X5101 device offline
- X5102 Direct API unavailable
- X5103 OTA not configured
- X5104 OTA unreachable
- X5105 backup not configured
- X5106 artifact/SHA metadata invalid
- X5110 version relation unknown
- X5111 same version / reinstall path
- X5112 downgrade blocked from normal update path

Important:
This gate validates SHA metadata availability/format. It does not claim that a
downloaded binary hash has already been verified. Actual byte-level SHA-256
comparison belongs to the OTA2 DOWNLOAD -> VERIFY stage.

No version bump. Firmware source unchanged. No commit/push.
