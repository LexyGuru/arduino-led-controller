# Beta.8 aktuális állapot

Dátum: 2026-08-06

## Verziópárosítás

| Elem | Verzió |
|---|---|
| Desktop alkalmazás | `5.0.0-beta.8` |
| Arduino firmware | `5.0.0-beta.6` |
| Direct API | `1.0.0` |
| Fejlesztési ág | `feature/beta7-ui-overhaul` |

## Firmware-állapot

A firmware kizárólag Direct API v1 útvonalakat szolgál ki. A legacy firmware-router, a legacy URL-diagnosztika, a legacy polling útvonalak és a kétféle JSON-válaszformátum eltávolításra került.

- eredeti BIN: `120796` bájt;
- jelenlegi BIN: `118516` bájt;
- teljes megtakarítás: `2280` bájt.

Az OTA maintenance mód az OTA előkészítésekor változatlanul hagyja az NTP UDP socketet, miközben szünetelteti a HTTP-kezelést, a schedulert, a LED-frissítést és a háttérfeladatokat.

## Desktop Beta.8

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

## Firmware 5.0.0-beta.6 OTA Exclusive Mode

Az `/api/v1/ota/prepare` után a firmware kizárólag a Wi-Fi kapcsolatot, az ArduinoOTA poll ciklust és a LED Matrix OTA-visszajelzését tartja aktívan. Az NTP UDP socket leáll, a NeoPixel frissítés leáll, a RAM-log írás némított, és a fő loop nem futtat HTTP-, scheduler-, EEPROM-, NTP-, LED- vagy egyéb háttérfeladatot az OTA ablak alatt. Hiba vagy előkészítési timeout után a normál szolgáltatások visszaállnak.

A production regression gate garantálja, hogy a prepare timeout feldolgozása az Exclusive Mode korai `return` előtt lefusson, és hogy az OTA útvonal ne törölje vagy írja újra a schedule storage-ot. A kézi Beta.5 hardverteszt 28 persistent schedule rekord mellett sikeres OTA-t és változatlan revision/checksum állapotot igazolt; a Beta.6 ezt a működést rögzíti production contractként.
