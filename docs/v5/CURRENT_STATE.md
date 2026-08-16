# Arduino LED Controller – Current Beta State

## Aktuális verziók
- Alkalmazás: `5.5.1-beta.7`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Fejlesztési ág: `next/v5-rearchitecture`

## Aktuális fejlesztési ciklus
- Alkalmazás release azonosító: `V55_BETA7`
- Állapot: release candidate
- Firmware Event Code Protocol: `v1`
- Firmware OTA cél: UNO R4 WiFi

## Beta.7 fókusz
- macOS `auto` / `bundled`: native Rust OTA first
- natív helyi OTA connect hiba esetén automatikus Terminal + `arduinoOTA` fallback
- Terminal fallback az Arduino friss `ipAddress:otaPort` státuszcélját használja
- sikeres transfer után maximum 180 s Direct API reboot/firmware confirmation
- GitHub firmware OTA és külső `.bin` OTA ugyanazt a fallback contractot használja
- Test Architecture V2: 19 CURRENT + 24 REGRESSION

## Változatlan komponensek
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Stable `main`: nem módosul
