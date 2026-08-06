# Arduino LED Controller V5

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Firmware Beta release](https://img.shields.io/badge/Firmware_Beta-release-blue?logo=githubactions)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml)
[![V5 Beta release](https://img.shields.io/badge/V5_Beta-release-blue?logo=githubactions)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml)

> A Beta.7 felületfejlesztés a `feature/beta7-ui-overhaul` ágon történik.
> A sikeresen stabilizált változások csak teljes regresszió után kerülhetnek vissza a `next/v5-rearchitecture` integrációs ágra. A `main` stabil ág nem módosul.

Többplatformos LED-vezérlő rendszer Arduino UNO R4 WiFi és három WS2812B LED-szalag számára. Az elsődleges üzemmód a közvetlen Arduino-kapcsolat; a Node.js/LXC szerver opcionális üzemeltetési réteg.

## Aktuális verziók és fejlesztési állapot

| Elem | Verzió / állapot |
|---|---|
| Alkalmazás | `5.0.0-beta.7` |
| Firmware | `5.0.0-beta.1` |
| Direct API | `1.0.0` |
| Kiadási csatorna | `beta` |
| Aktuális kiadás | Beta.6 |
| Folyamatban lévő fejlesztés | Beta.7 UI Freeze |
| Aktív fejlesztési ág | `feature/beta7-ui-overhaul` |
| Integrációs ág | `next/v5-rearchitecture` |
| Stabil ág | `main` |

A Beta.7 az új desktop felület, a Theme Engine, az auditált műveletek, a csatornahelyes firmware-katalógus, a macOS UNO R4 Terminal OTA útvonal és a Direct API v1-only firmware első integrált tesztkiadása. A hozzá párosított firmware 5.0.0-beta.1; a Direct API verziója változatlanul 1.0.0.

## Fő funkciók

- három WS2812B LED-szalag közvetlen vezérlése;
- fényerő, RGB-szín, effekt és sebesség kezelése;
- gyors tesztmódok és tömeges LED-műveletek;
- legfeljebb 60 Arduino EEPROM schedule rekord;
- schedule revision/checksum ellenőrzés és konfliktusvédelem;
- JSON import/export, automatikus backup és visszaállítás;
- Arduino-idő alapú mai/holnapi schedule-megjelenítés;
- autonóm CET/CEST és DST-kezelés, UDP NTP fallback és `time status`;
- stable/beta firmware-katalógus csatornahelyes szűréssel;
- megszakítható OTA, SHA-256 ellenőrzés és reboot utáni állapotkapu;
- magyar, angol és német felület azonnali nyelvváltással;
- System / Light / Dark mód, Arctic / Midnight téma és kiemelőszínek;
- helyi műveleti audit és Tauri auditkonzol új Arduino API-polling nélkül;
- macOS Keychain, Windows Credential Manager és Linux Secret Service támogatás.

## Architektúra

```text
Tauri desktop / mobil
        │
        │ Direct API v1 + X-Device-Key
        ▼
Arduino UNO R4 WiFi
        ├─ 3 LED-szalag
        ├─ 60 EEPROM schedule rekord
        ├─ A/B EEPROM tárolás
        ├─ autonóm időzóna / DST / NTP
        ├─ diagnosztika és Arduino-konzol
        ├─ OTA desktopról
        └─ távoli reboot

Tauri helyi réteg
        ├─ Theme Engine
        ├─ helyi műveleti audit
        ├─ Tauri auditkonzol
        ├─ firmware-katalógus és cache
        └─ platform credential store

Opcionális:
Node.js / LXC üzemeltetési réteg
```

A Direct Arduino módhoz nem szükséges alkalmazás-felhasználónév vagy szerverjelszó. A kliens a privát API-útvonalat és az `X-Device-Key` eszközkulcsot használja.

## Megjelenés és audit

A Beta.7 Theme Engine központi design tokeneket és perzisztált megjelenési beállításokat használ:

- rendszer szerinti, világos és sötét mód;
- Arctic és Midnight téma;
- több kiemelőszín;
- kompakt, kényelmes és érintésbarát sűrűség;
- állítható lekerekítés, animáció és glass effekt.

A Logok oldalon:

- az Arduino-konzol az eszköz naplóit mutatja;
- a Legutóbbi műveletek a helyi LED-, schedule-, időszinkron-, firmware- és OTA-műveleteket mutatja;
- a Tauri auditkonzol a helyi alkalmazás- és meglévő hálózati eseményeket mutatja;
- a régi üres Event Bus panel nem része a Direct Arduino felületnek.

## Firmware és Direct API

A jelenlegi ajánlott Beta firmware: `4.3.0-beta.6`. A Direct API verziója `1.0.0`.

Biztonsági tulajdonságok:

- kizárólag fejlécalapú `X-Device-Key`;
- query-string kulcsfallback tiltva;
- JSON body alapú módosító végpontok;
- A/B EEPROM slotok readback ellenőrzéssel;
- tranzakciós schedule írás;
- védett `POST /api/v1/system/reboot`;
- `HTTP 202 Accepted` távoli reboot.

## OTA frissítés

A desktop alkalmazás:

- stable vagy beta GitHub Release katalógust használ;
- ellenőrzi a firmware artifact SHA-256 értékét;
- cache-ből is újraellenőrzi a binárist;
- megszakítható feltöltést és élő OTA-konzolt biztosít;
- ellenőrzi a Boot ID változását;
- ellenőrzi a schedule revision és checksum megmaradását;
- a világos és sötét témában is olvasható konzolt és rollback-listát használ.

Az OTA-jelszó nem kerülhet forráskódba vagy konfigurációs exportba.

## Gyors kezdés

### Firmware

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  firmware/ArduinoLedController
```

### Repository és desktop tesztek

```bash
npm ci
npm run validate
npm test

cd desktop-tauri
npm ci
npm run build
cd ..

cargo fmt --manifest-path desktop-tauri/src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

## Ágak és kiadás

- `main`: stabil, védett ág.
- `next/v5-rearchitecture`: beta integrációs ág.
- `feature/beta7-ui-overhaul`: Beta.7 Theme Engine és UI Freeze fejlesztési ág.
- `.github/workflows/firmware-beta-release.yml`: dedikált Beta firmware prerelease.
- `.github/workflows/beta-release.yml`: teljes alkalmazás prerelease, manuális indítással.
- A prerelease nem jelölhető latest stabil kiadásnak.

## Dokumentáció

- [Beta.7 UI Freeze állapot](docs/v5/BETA7_UI_FREEZE.md)
- [Beta.7 Markdown-audit](docs/v5/MARKDOWN_AUDIT_BETA7.md)
- [Beta.6 release notes](docs/v5/BETA6_RELEASE_NOTES.md)
- [Beta.6 telepítési útmutató](docs/v5/BETA6_INSTALLATION_GUIDE.md)
- [Beta.6 release checklist](docs/v5/BETA6_RELEASE_CHECKLIST.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API v1](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

A Beta.6 dokumentumok történeti kiadási dokumentumok, ezért a verziószámaik nem cserélendők Beta.7-re.

## Biztonság

Ne nyiss közvetlen internetes portot az Arduino API vagy OTA számára. Távoli eléréshez HTTPS reverse proxy és érvényes TLS chain ajánlott. Titkokat, API-kulcsot, OTA-jelszót, `.env` vagy `secrets.h` fájlt soha ne commitolj.

## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg. Külső terjesztés előtt külön `LICENSE` fájl szükséges.
