# Beta.3 OTA2 Native Bridge + Post-Verify Mega

Adds a non-duplicating adapter over the existing native Rust/LXC OTA transaction:
- firmwareStatus()
- firmwareInstallRelease(tag)
- listenOtaProgress(listener)

Includes OTA progress to stage mapping, X54xx runtime codes, Boot ID validation,
expected firmware version validation, schedule revision/checksum persistence
validation, X55xx postverify codes, and X56xx bridge codes.

The destructive upload remains inside the existing native Rust/LXC installer.
No duplicate upload/download is introduced.

No version bump. Firmware source unchanged. No commit/push.
