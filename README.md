# Arduino LED Controller V5

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Firmware Beta release](https://img.shields.io/badge/Firmware_Beta-release-blue?logo=githubactions)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml)
[![V5 Beta release](https://img.shields.io/badge/V5_Beta-release-blue?logo=githubactions)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml)

> A Beta release workflow-k a `next/v5-rearchitecture` fejlesztési ágon futnak.

Többplatformos LED-vezérlő rendszer Arduino UNO R4 WiFi és három WS2812B LED-szalag számára. Az elsődleges üzemmód a közvetlen Arduino-kapcsolat; a Node.js/LXC szerver opcionális.

## Aktuális verziók

| Elem | Verzió / állapot |
|---|---|
| Alkalmazás | `5.0.0-beta.6` |
| Firmware | `4.3.0-beta.5` |
| Direct API | `1.0.0` |
| Kiadási csatorna | `beta` |
| Állapot | nyilvános beta |
| Aktív fejlesztési ág | `next/v5-rearchitecture` |
| Stabil ág | `main` |

A beta.5 többnyelvű stabilizációs kiadás. A desktop és mobil felület, valamint a runtime-, kapcsolat-, LED-, schedule-, firmware- és OTA-üzenetek magyarul, angolul és németül érhetők el. A firmware-protokoll nem változott.

## Fő funkciók

- három WS2812B LED-szalag közvetlen vezérlése;
- fényerő, RGB-szín, effekt és sebesség kezelése;
- gyors tesztmódok és tömeges LED-műveletek;
- legfeljebb 60 Arduino EEPROM schedule rekord;
- teljes schedule letöltés, revision/checksum ellenőrzés és konfliktusvédelem;
- JSON import/export, automatikus backup és visszaállítás;
- stable/beta firmware-katalógus csatornahelyes szűréssel;
- megszakítható OTA, SHA-256 ellenőrzés és reboot utáni állapotkapu;
- magyar, angol és német felület azonnali nyelvváltással;
- macOS Keychain, Windows Credential Manager és Linux Secret Service támogatás.

## Architektúra

```text
Tauri desktop / mobil
        │
        │ Direct API v1 + X-Device-Key
        ▼
Arduino UNO R4 WiFi
        ├─ 3 LED-szalag
        ├─ 60 schedule rekord
        ├─ A/B EEPROM tárolás
        ├─ diagnosztika és konzol
        ├─ OTA desktopról
        └─ távoli reboot

Opcionális:
Node.js / LXC üzemeltetési réteg
```

A Direct Arduino módhoz nem szükséges felhasználónév vagy jelszó. A kliens a privát API-útvonalat és az `X-Device-Key` eszközkulcsot használja.

## Kapcsolati módok

- **LAN:** közvetlen helyi HTTP-kapcsolat az Arduino felé.
- **DDNS / HTTPS:** távoli kapcsolat érvényes TLS-tanúsítvánnyal rendelkező reverse proxyn keresztül.
- **macOS:** alapértelmezetten DDNS-first működés; a helyi API külön engedélyezhető.
- **Mobil:** vezérlés és schedule-kezelés támogatott; natív OTA állapot- és kapcsolatellenőrzés letiltott.

## Nyelvek

- magyar (`hu`);
- angol (`en`);
- német (`de`).

Az új UI- és runtime-szövegek kizárólag a központi `desktop-tauri/src/i18n/index.tsx` szótárba kerülhetnek. A három nyelv kulcskészletének azonosnak kell lennie.

## Firmware és Direct API

A párosított firmware: `4.3.0-beta.5`. A Direct API verziója `1.0.0`.

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
- ellenőrzi a schedule revision és checksum megmaradását.

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

A `secrets.h` helyi fájl, Gitbe és release-csomagba nem kerülhet.

### Repository tesztek

```bash
npm ci
npm test
npm run validate
```

### Tauri frontend és Rust

```bash
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
- `next/v5-rearchitecture`: beta és integrációs fejlesztés.
- beta release workflow: `.github/workflows/beta-release.yml`.
- a beta workflow prerelease-t készít, és nem jelöli latest stabil kiadásnak.

## Dokumentáció

- [Beta.5 release notes](docs/v5/BETA5_RELEASE_NOTES.md)
- [Beta.5 telepítési útmutató](docs/v5/BETA5_INSTALLATION_GUIDE.md)
- [Beta.5 release checklist](docs/v5/BETA5_RELEASE_CHECKLIST.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API v1](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [V5 állapot](docs/v5/V5_IMPLEMENTATION_STATUS.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

## Biztonság

Ne nyiss közvetlen internetes portot az Arduino API vagy OTA számára. Távoli eléréshez HTTPS reverse proxy és érvényes TLS chain ajánlott. Titkokat, API-kulcsot, OTA-jelszót, `.env` fájlt vagy `secrets.h` fájlt soha ne commitolj.

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg. Külső terjesztés előtt külön `LICENSE` fájl szükséges.


## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.
