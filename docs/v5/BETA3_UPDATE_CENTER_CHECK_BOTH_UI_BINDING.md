# Beta.3 Update Center Check both UI binding

V499 binds the existing FirmwarePage refresh actions to one shared runtime handler.

The shared handler calls:
- state.refresh({ forceCheck: true })
- refreshCatalog()

through runUpdateCenterCheckBoth(), so one user action refreshes the device/app/OTA
status path and the independent firmware catalog path.

The heading "Ellenőrzés" button and UpdateCenterPanel.onCheck use the exact same
checkBoth handler.

No second firmwareStatus request is introduced.
No version bump. Firmware source unchanged. No commit/push.
