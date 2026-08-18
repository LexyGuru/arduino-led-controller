# V5.5.1 Beta.7 Release Notes

Application `5.5.1-beta.7`; firmware `5.0.0-beta.10`; Direct API `1.0.0`.

## OTA fallback recovery
- `auto` / `bundled` remains native Rust OTA first.
- On macOS, a zero-byte native local-connect failure automatically falls back to Terminal + `arduinoOTA`.
- Terminal uses the Arduino fresh `ipAddress:otaPort` status target.
- GitHub firmware OTA and external `.bin` OTA share the same fallback contract.
- Successful transfer is followed by the existing maximum 180-second Direct API reboot, bootGeneration, Boot ID and firmware-version confirmation.
- Runtime verification updated firmware `5.0.0-beta.9` to `5.0.0-beta.10` successfully.

## Preserved platform contracts
- Theme Engine 2.5 is not modified.
- Update System 2.0 behavior is preserved.
- LXC runtime behavior is not modified; version metadata follows `5.5.1-beta.7`.
- Stable `main` is not modified.

## Test Architecture V2
19 CURRENT + 24 REGRESSION.
