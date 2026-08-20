# Arduino LED Controller 5.7.0-beta.3

## Firmware channel hotfix

- Fixes firmware OTA installation so the selected firmware channel is authoritative end-to-end.
- Stable firmware install resolves only Stable artifacts.
- Beta firmware install resolves only Beta artifacts.
- The OTA transport layer no longer re-selects the release channel.
- Firmware remains 5.0.0 Stable; firmware source is unchanged.
