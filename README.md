# Arduino LED Controller V5.8

## Current Stable release — 5.8.0

- **Application:** `5.8.0`
- **Firmware:** `5.1.0` Stable
- **Direct API:** `1.0.0`
- **Theme Engine:** `2.0`
- **Core UI:** `3.0`
- **Stable branch:** `main`
- **Beta / development branch:** `next/v5-rearchitecture`
- **Board:** `arduino:renesas_uno:unor4wifi`
- **OTA port:** `65280`

### Stable release documentation

- [V5.8 Stable release notes](docs/v5/V58_STABLE_RELEASE_NOTES.md)
- [V5.8 Stable installation guide](docs/v5/V58_STABLE_INSTALLATION_GUIDE.md)
- [V5.8 Stable release checklist](docs/v5/V58_STABLE_RELEASE_CHECKLIST.md)
- [Root release notes](RELEASE_NOTES_5.8.0.md)
- [Firmware 5.1.0 release notes](firmware/RELEASE_NOTES_5.1.0.md)

<p align="center">
  <strong>Direct Arduino Control &amp; Automation</strong>
</p>

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg?branch=main)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Firmware Stable release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-stable-release.yml/badge.svg?branch=main)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-stable-release.yml)
[![Application Stable release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-stable-release.yml/badge.svg?branch=main)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-stable-release.yml)
[![Firmware Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml)
[![Application Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-beta-release.yml)

<p align="center">
  <img src="docs/assets/v5-neon-panel-presentation.png" alt="Arduino LED Controller V5 – Neon Panel" />
</p>

Többplatformos vezérlő- és automatizálási rendszer **Arduino UNO R4 WiFi** és három
WS2812B LED-szalag számára. A közös React felület desktopon, mobilon és a Debian 13
Rust LXC webes környezetében használható, miközben az Arduino önálló **Direct API v1**
végpontként is működik.

---

## Aktuális kiadás

| Komponens | Aktuális verzió / állapot |
|---|---|
| Alkalmazás | **`5.8.0` Stable** |
| Firmware | **`5.1.0` Stable** |
| Direct API | **`1.0.0`** |
| Theme Engine | **`2.0`** |
| Core UI | **`3.0`** |
| Stabil ág | `main` |
| Fejlesztési / Beta ág | `next/v5-rearchitecture` |
| Arduino board | `arduino:renesas_uno:unor4wifi` |
| OTA port | `65280` |
| LXC rendszer | Debian 13 |
| LXC web/API port | `3000` |

A **V5.8 Stable** a V5.8 Beta fejlesztési sorozat tesztelt, stabil kiadása.
A Stable alkalmazás és a Stable firmware külön release-folyamatban készül.

---

## V5.8 platform

### Közös alkalmazásplatform

- **Theme Engine 2.0**
- **Core UI 3.0**
- Dashboard, Statistics, Activity & Logs
- Firmware / Schedules / Settings kezelőfelületek
- Stable/Beta update channel
- Shared React UI desktop, iOS/iPadOS, Android és LXC környezethez

### LED és automatizálás

- 3 × WS2812B LED-szalag közvetlen vezérlése
- fényerő, RGB-szín, effekt és sebesség
- schedule revision/checksum és konfliktusvédelem
- tranzakciós schedule írás
- JSON import/export
- backup és visszaállítás
- autonóm CET/CEST és DST
- UDP NTP időszinkron

### Firmware és OTA

- Stable/Beta firmware-katalógus
- SHA-256 ellenőrzés
- élő OTA konzol
- OTA Exclusive Mode
- reboot utáni `/api/v1/status` életjel
- Boot ID és schedule persistence ellenőrzés
- OTA-jelszó secure store-ban

---

## GitHub Actions és kiadási architektúra

| Workflow | Szerep |
|---|---|
| `app-build.yml` | alkalmazás CI/build |
| `app-staging-build.yml` | staging artifact build |
| `app-beta-release.yml` | Beta alkalmazásrelease |
| `app-stable-release.yml` | Stable alkalmazásrelease |
| `firmware-build.yml` | firmware build |
| `firmware-beta-release.yml` | Beta firmware release |
| `firmware-stable-release.yml` | Stable firmware release |

```text
Stable
  main
  Application 5.8.0
  Firmware 5.1.0

Beta / development
  next/v5-rearchitecture
```

---

## Támogatott futtatási környezetek

| Platform | Runtime | Fő feladat |
|---|---|---|
| macOS | Tauri v2 + Rust + React | natív desktop kliens |
| Windows | Tauri v2 + Rust + React | natív desktop kliens |
| Linux | Tauri v2 + Rust + React | natív desktop kliens |
| iOS / iPadOS | Tauri mobile + shared React UI | mobil kliens |
| Android | Tauri mobile + shared React UI | mobil kliens |
| Debian 13 LXC | Rust/Axum + React/Vite | web UI, proxy, központi runtime |
| Arduino UNO R4 WiFi | Firmware 5.1.0 + Direct API v1 | LED, schedule, OTA, időkezelés |

---

## Architektúra

```text
                         ┌─────────────────────────────┐
                         │ Arduino UNO R4 WiFi         │
                         │ Firmware 5.1.0 Stable       │
                         │ Direct API v1 / X-Device-Key│
                         └──────────────┬──────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                │                                               │
                ▼                                               ▼
┌───────────────────────────────┐             ┌────────────────────────────────┐
│ Tauri V5.8 Stable client      │             │ Debian 13 Rust LXC             │
│ Shared React UI               │             │ Rust / Axum backend            │
│ Direct Arduino API            │             │ React / Vite web UI :3000      │
│ Firmware / OTA                │             │ Direct API proxy               │
└───────────────────────────────┘             └────────────────────────────────┘
```

---

## Direct API és biztonság

A firmware jelenlegi Direct API verziója: **`1.0.0`**.

- `X-Device-Key` fejlécalapú hitelesítés
- query-string kulcsfallback tiltva
- privát API-prefix
- tranzakciós schedule írás
- védett `POST /api/v1/system/reboot`

Titkokat, Device Key-t, OTA-jelszót, `.env`, `update.env` vagy `secrets.h` fájlt
nem szabad commitolni.

---

## OTA frissítés

```text
Firmware BIN ellenőrzés
        ↓
OTA feltöltés
        ↓
Arduino flash + reboot
        ↓
Direct API /api/v1/status életjel
        ↓
firmwareVersion + Boot ID + schedule persistence
        ↓
SUCCESS
```

A firmware **5.1.0 Stable** a Stable firmware-katalógust használja.

---

## Debian 13 Rust LXC

Stable telepítés Proxmox hostról:

```bash
bash -c "$(curl -fsSL 'https://raw.githubusercontent.com/LexyGuru/arduino-led-controller/main/deploy/proxmox/install-proxmox-lxc.sh')"
```

Fejlesztési/Beta telepítéshez a `next/v5-rearchitecture` ág használható.

### Diagnosztikai végpontok

```text
/health/live
/health/ready
/api/v1/status
```

### LXC updater

Az LXC updater csatornafüggő **automatikus frissítés** mellett támogatja a Stable
és Beta ágakat.

```text
Stable -> main
Beta   -> next/v5-rearchitecture
```

---

## Gyors kezdés fejlesztéshez

### Firmware

```bash
cp firmware/ArduinoLedController/secrets.example.h    firmware/ArduinoLedController/secrets.h

arduino-cli compile   --fqbn arduino:renesas_uno:unor4wifi   firmware/ArduinoLedController
```

### Repository és desktop

```bash
npm ci
npm run validate
npm test

cd desktop-tauri
npm ci
npm run build
cd ..

cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

---

## Ágak és release-folyamat

| Ág / workflow | Szerep |
|---|---|
| `main` | Stable alkalmazásvonal |
| `next/v5-rearchitecture` | Beta / fejlesztési integráció |
| `app-beta-release.yml` | Beta alkalmazásrelease |
| `app-stable-release.yml` | Stable alkalmazásrelease |
| `firmware-beta-release.yml` | Beta firmware release |
| `firmware-stable-release.yml` | Stable firmware release |
| `firmware-build.yml` | firmware build |

---

## Dokumentáció

### Aktuális Stable

- [V5.8 Stable release notes](docs/v5/V58_STABLE_RELEASE_NOTES.md)
- [V5.8 Stable telepítési útmutató](docs/v5/V58_STABLE_INSTALLATION_GUIDE.md)
- [V5.8 Stable release checklist](docs/v5/V58_STABLE_RELEASE_CHECKLIST.md)
- [Root release notes](RELEASE_NOTES_5.8.0.md)
- [Firmware 5.1.0 release notes](firmware/RELEASE_NOTES_5.1.0.md)
- [Rust LXC architektúra](docs/v5/RUST_LXC_ARCHITECTURE.md)
- [Rust LXC üzemeltetés](docs/v5/RUST_LXC_OPERATIONS.md)
- [Shared frontend architektúra](docs/SHARED_FRONTEND_ARCHITECTURE.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API v1](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

### Történeti dokumentáció

A korábbi Beta és Stable release-dokumentumok a repositoryban maradnak release-
történetként. A bennük szereplő verziószámok nem az aktuális Stable állapotot
jelentik.

---

## V5 Platform Icon System

| Channel | Light | Dark |
|---|---|---|
| Stable | Stable Light | Stable Dark |
| Beta | Beta Light | Beta Dark |

---

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg.
Külső terjesztés előtt külön `LICENSE` fájl szükséges.
