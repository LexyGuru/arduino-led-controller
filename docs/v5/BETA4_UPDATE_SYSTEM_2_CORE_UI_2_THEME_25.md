# Beta.4 current platform identity and Update System 2.0

Current visible product identity:
- Core UI 2.0
- Theme Engine 2.5
- OTA 2.0
- Update System 2.0
- Beta 4 UI

Compatibility file/class names from Core UI 1.5 and Theme Engine 2.0 are kept
where they are part of the established runtime/storage migration contract.

Update behavior:
- Check Both performs checks only.
- Desktop app updates use the existing V539 signed native updater.
- Firmware updates use their separate OTA 2.0 install action.
- Android/iOS hide desktop AppUpdateCenter/self-update controls.
- Mobile firmware/OTA controls remain available.
- Android APK/AAB, iOS/iPadOS IPA and LXC updater release flows are unchanged.

Application comparison prefers normalized availableApp.version over the raw
GitHub tag so an older GitHub release is classified as older, not unknown.
