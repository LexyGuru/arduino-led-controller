# Arduino LED Controller – Current Beta State

## Aktuális verziók
- Alkalmazás: `5.6.0-beta.1`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Fejlesztési ág: `next/v5-rearchitecture`

## Theme Engine 2.0
12 factory themes, custom profile, expanded accents, material/gradient/contrast controls,
JSON import/export and v1/v2 storage migration.

## Platform contract
Shared frontend across desktop/mobile/web-LXC. Platform-specific adapters remain isolated.

## macOS OTA
Beta.7 macOS OTA and its immutable baseline remain frozen.

## Firmware
Firmware remains `5.0.0-beta.10`.

## Startup UX
The 5.6.0-beta.1 candidate includes an animated startup integrity gate and
shared page-transition motion. External Arduino/API connectivity is advisory:
offline state is surfaced as a warning while normal background retry behavior continues.
