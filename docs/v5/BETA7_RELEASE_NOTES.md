# Arduino LED Controller 5.0.0-beta.7

## Multilingual Desktop Stabilization + Firmware Compatibility Update

A Beta.7 alkalmazáskiadás a teljes magyar, angol és német felületet, a központi runtime-üzenetréteget és a kiadási dokumentáció egységesítését tartalmazza.

Az alkalmazás binárisverziója továbbra is `5.0.0-beta.7`. A hozzá tartozó, jelenleg ajánlott Beta firmware időközben `4.3.0-beta.6` verzióra frissült, és külön, az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben érhető el.

## Verziók

- Alkalmazás: `5.0.0-beta.7`
- Jelenlegi ajánlott firmware: `4.3.0-beta.6`
- Direct API: `1.0.0`
- Csatorna: `beta`
- GitHub prerelease: igen

## Alkalmazás – fő változások

- teljes HU/EN/DE lokalizáció;
- azonnali nyelvváltás és perzisztált választás;
- rendszer-nyelv automatikus felismerése;
- fordítható runtime-, kapcsolat-, LED-, schedule-, firmware- és OTA-üzenetek;
- i18n source-integrity és HU/EN/DE kulcsparitási kapu;
- frissített mobilos és desktop contractok;
- Beta.7 telepítési útmutató és release checklist.

## Firmware 4.3.0-beta.6

A jelenlegi Beta firmware fontosabb változásai:

- önálló Arduino-oldali CET/CEST és DST-kezelés;
- `Europe/Vienna` és más közép-európai időzónák automatikus átállása;
- regionális európai NTP-források és UDP NTP fallback;
- RTC-alapú önálló időkövetés;
- új `time status` soros diagnosztikai parancs;
- kibővített `schedule status`;
- NTP- és időzóna-frissítés utáni azonnali scheduler-egyeztetés;
- újraindítás utáni schedule-állapotrekonstrukció;
- javított A/B EEPROM-diagnosztika;
- Direct API továbbra is `1.0.0`;
- fejlécalapú `X-Device-Key`;
- 60 rekordos, tranzakciós schedule-tárolás;
- OTA és távoli reboot protokoll.

## Kompatibilitás

- alkalmazás: `5.0.0-beta.7`;
- firmware: `4.3.0-beta.6`;
- Direct API: `1.0.0`;
- csatorna: `beta`.

## Ág- és hardverbiztonság

- A `main` ág nem módosul; a fejlesztés kizárólag a `next/v5-rearchitecture` ágon történik.
- A staging alapértelmezésben nem használja a produkciós Arduino `10.0.0.123` címét.
- Produkciós hardver csak külön, explicit engedéllyel érhető el.

## Kiadási bizonyítékok

Az alkalmazásrelease tartalmazza a platformartifactokat, `SHA256SUMS`, `RELEASE-MANIFEST.json`, `release-versions.json`, `firmware-release.json`, `latest-beta.json`, SBOM, provenance és secret-scan fájlokat.

## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.

A `4.3.0-beta.6` firmware assetje:

`Arduino_LED_Controller_Firmware_4.3.0-beta.6_UNO_R4_WiFi.bin`
