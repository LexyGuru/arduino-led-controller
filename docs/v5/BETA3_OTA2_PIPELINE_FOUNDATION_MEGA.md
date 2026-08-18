# Beta.3 OTA2 Pipeline Foundation Mega

V501 consolidates three related OTA2 layers:

1. Artifact/checksum verification
- checksumUrl resolver
- common SHA-256 file formats
- real SHA-256 over downloaded bytes
- byte-level expected-vs-actual comparison
- download+verify pure contract

2. OTA2 stage machine
CHECK -> DOWNLOAD -> VERIFY -> BACKUP -> CONNECT -> UPLOAD -> FLASH ->
REBOOT_WAIT -> VERSION_VERIFY -> PERSISTENCE_VERIFY -> SUCCESS
Every non-terminal stage may also enter FAILURE.

3. Install coordinator
- preflight must pass before DOWNLOAD
- VERIFY must pass before BACKUP
- missing/failed steps terminate in FAILURE
- stage events can later feed UI/progress/audit
- existing X51xx preflight codes are preserved
- X52xx artifact codes and X53xx pipeline codes are introduced

This is intentionally a platform-neutral orchestration foundation.
It does not replace the existing Rust installer yet and does not double-download
firmware in the live application. The next integration package can map the
existing native Rust/LXC install steps to this coordinator.

No version bump. Firmware source unchanged. No commit/push.
