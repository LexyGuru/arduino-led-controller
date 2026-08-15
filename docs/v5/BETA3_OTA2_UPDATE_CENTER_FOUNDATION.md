# Beta.3 – OTA2 / Update Center 2.0 Foundation

Base application: `5.5.1-beta.2`
Base firmware: `5.0.0-beta.9`
Direct API: `1.0.0`

This candidate adds a unified application/firmware Update Center, semantic
prerelease version comparison and an OTA2 readiness gate.

The normal firmware update path requires Arduino online, OTA configured,
backup service configured and a genuinely newer firmware version. Downgrade
remains a Restore-only operation.

No application/firmware version change, commit or push is performed.


## V483 UI consolidation

- Update Center cards are compact and balanced.
- OTA2 readiness is shown as three pills inside the Firmware card.
- The normal install action disappears when firmware is already current.
- Duplicate installed/available/app-channel cards were removed.
- Only OTA target and backup service remain as supporting technical stats.
- Narrow layouts collapse to one column.
