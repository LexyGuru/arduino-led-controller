# Beta.7 aktuális állapot

Dátum: 2026-08-06

## Verziópárosítás

| Elem | Verzió |
|---|---|
| Desktop alkalmazás | `5.0.0-beta.7` |
| Arduino firmware | `5.0.0-beta.5` |
| Direct API | `1.0.0` |
| Fejlesztési ág | `feature/beta7-ui-overhaul` |

## Firmware-állapot

A firmware kizárólag Direct API v1 útvonalakat szolgál ki. A legacy firmware-router, a legacy URL-diagnosztika, a legacy polling útvonalak és a kétféle JSON-válaszformátum eltávolításra került.

- eredeti BIN: `120796` bájt;
- jelenlegi BIN: `118516` bájt;
- teljes megtakarítás: `2280` bájt.

Az OTA maintenance mód az OTA előkészítésekor változatlanul hagyja az NTP UDP socketet, miközben szünetelteti a HTTP-kezelést, a schedulert, a LED-frissítést és a háttérfeladatokat.

## Desktop Beta.7

- Theme Engine és Design System;
- Arctic és Midnight megjelenés;
- Tauri auditkonzol és helyi műveleti audit;
- csatornahelyes stable/beta firmware-katalógus;
- schedule backup, restore és teljes törlés;
- macOS UNO R4 helyi `arduinoOTA` Terminal útvonal;
- Keychain munkamenet-cache;
- Direct API v1 status, logs, LED, schedule és OTA transport.

## Kiadási döntés

Ez integrációs tesztcommit. Tag és GitHub Release még nem készül.

## Firmware 5.0.0-beta.5 OTA Exclusive Mode

Az `/api/v1/ota/prepare` után a firmware kizárólag a Wi-Fi kapcsolatot, az ArduinoOTA poll ciklust és a LED Matrix OTA-visszajelzését tartja aktívan. Az NTP UDP socket leáll, a NeoPixel frissítés leáll, a RAM-log írás némított, és a fő loop nem futtat HTTP-, scheduler-, EEPROM-, NTP-, LED- vagy egyéb háttérfeladatot az OTA ablak alatt. Hiba vagy előkészítési timeout után a normál szolgáltatások visszaállnak.
