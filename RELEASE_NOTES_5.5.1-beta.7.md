# Arduino LED Controller 5.5.1-beta.7 — Beta.7 OTA Fallback Recovery

- Application: `5.5.1-beta.7`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Channel: Beta / `next/v5-rearchitecture`
- Stable `main`: not modified

macOS `auto` / `bundled` OTA is native-first. If the Tauri process cannot reach
the local OTA socket before any firmware bytes are transferred, the application
automatically opens Terminal and runs `arduinoOTA` against the Arduino fresh
status `ipAddress:otaPort`.

After a successful transfer the existing Direct API confirmation state machine
waits up to 180 seconds for reboot evidence and the expected firmware version.

Firmware source remains unchanged at `5.0.0-beta.10`.
