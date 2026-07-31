# macOS DDNS-first Direct API

## Platform rule

On macOS the desktop application uses the configured remote/DDNS endpoint as the default Arduino HTTP API route. Direct LAN API targets are excluded unless the user explicitly enables the advanced `macosLocalApiEnabled` option.

This rule is independent of signing state. It provides consistent behavior for all macOS users while keeping Windows and Linux target ordering configurable through `preferLocal`.

## API and OTA separation

- Arduino HTTP API: remote/DDNS host and API port.
- Firmware OTA: separately configured local host, OTA port and local `arduinoOTA` executable.
- On macOS `otaUseApiHost` is forced off when configuration is loaded or saved.

## HTTP transport

The native Direct API client uses `reqwest::blocking::Client` inside the existing Tauri blocking task. This replaces the hand-written TCP response parser and correctly handles DNS, Content-Length, connection close, proxy buffering and complete JSON body reads.

## Migration

Existing macOS profiles are loaded with `preferLocal=false` and `otaUseApiHost=false`. The saved local IP remains available for OTA and for the optional advanced local-API override.
