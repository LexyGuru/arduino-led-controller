# Arduino LED Controller V5

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![V5 Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml)

Többplatformos LED-vezérlő rendszer Arduino UNO R4 WiFi és három WS2812B LED-szalag számára.

## Aktuális állapot

| Elem | Verzió / állapot |
|---|---|
| Alkalmazás | `5.0.0-beta.3` |
| Firmware | `4.3.0-beta.2` |
| Direct API | `1.0.0` |
| Firmware feature | `f14-complete-direct-api-storage` |
| Firmware hardverkapu | sikeres |
| Aktív fejlesztési ág | `next/v5-rearchitecture` |

A firmware végleges F14 hardverkapuja bizonyította az OTA-frissítést, a 60 rekordos A/B EEPROM schedule-t, a tranzakciós írást, az `offset` lapozást, a fejlécalapú hitelesítést és a `HTTP 202` távoli rebootot.

## Architektúra

```text
Tauri desktop / mobil
        │
        │ közvetlen HTTP API
        │ X-Device-Key
        ▼
Arduino UNO R4 WiFi
        ├─ 3 LED-szalag
        ├─ 60 schedule rekord
        ├─ A/B EEPROM tárolás
        ├─ diagnosztika
        ├─ OTA desktopról
        └─ távoli reboot
```

A Node.js/LXC réteg opcionális kompatibilitási és üzemeltetési komponens. A következő fejlesztési fázis a Tauri felület és kliensarchitektúra egyszerűsítése; az Arduino közvetlen API-ja az elsődleges adatforrás. A Beta.3-ban a heti időzítés teljes, lapozott Arduino-snapshotot használ, revision-konfliktusvédelemmel és readback után frissülő helyi cache-sel.

## Gyors kezdés

### Firmware

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  firmware/ArduinoLedController
```

A `secrets.h` helyi fájl, Gitbe nem kerülhet. A query-string kulcsfallback forráskódban véglegesen tiltott.

### Node regresszió

```bash
npm ci
npm test
bash scripts/validate-repository.sh
```

### Tauri frontend

```bash
cd desktop-tauri
npm ci
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

## Dokumentáció

- [Firmware áttekintés](firmware/README.md)
- [Firmware 4.3.0-beta.2](docs/firmware/FIRMWARE_4_3_0_BETA_2.md)
- [Direct API v1](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Firmware tesztelés](docs/firmware/TESTING.md)
- [V5 állapot](docs/v5/V5_IMPLEMENTATION_STATUS.md)
- [V5 checklist](docs/v5/V5_REARCHITECTURE_CHECKLIST.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változások](CHANGELOG.md)

## Biztonsági alapelvek

- A kliens a kulcsot kizárólag `X-Device-Key` fejlécben küldi.
- A kulcs és a privát API-útvonal nem kerülhet URL-paraméterbe, naplóba vagy release-csomagba.
- Az OTA-port csak megbízható helyi hálózaton használható.
- A `secrets.h`, `.env` és privát profilfájlok tiltott repository-tartalmak.

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg. Külső terjesztés előtt külön `LICENSE` fájl hozzáadása szükséges.
