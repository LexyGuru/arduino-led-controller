# Arduino LED Controller V6

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.2`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

<!-- CURRENT_RELEASE_DOCS_SSOT_BEGIN -->
- Release notes: `docs/v5/V60_BETA2_RELEASE_NOTES.md`
- Installation guide: `docs/v5/V60_BETA2_INSTALLATION_GUIDE.md`
- Release checklist: `docs/v5/V60_BETA2_RELEASE_CHECKLIST.md`
- Language architecture: `docs/v6/LANGUAGE_PACK_ARCHITECTURE_2_0.md`
- Root release notes: `RELEASE_NOTES_6.0.0-beta.2.md`
<!-- CURRENT_RELEASE_DOCS_SSOT_END -->

<p align="center">
  <strong>Direct Arduino Control & Automation</strong>
</p>

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Firmware Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml)
[![V6 Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/app-beta-release.yml)

<p align="center">
  <img src="docs/assets/v5-neon-panel-presentation.png" alt="Arduino LED Controller V6 control interface presentation" />
</p>

Többplatformos vezérlő- és automatizálási rendszer **Arduino UNO R4 WiFi** és
három WS2812B LED-szalag számára. A V6 közös React felületet használ desktopon,
mobilon és a Debian 13 Rust LXC környezetben. Az Arduino továbbra is önálló
Direct API végpont, az alkalmazás- és firmware-release folyamat egymástól külön él.

---

## Aktuális Beta kiadás

> **Arduino LED Controller 6.0.0-beta.2 — Language Pack Architecture 2.0**

| Komponens | Aktuális Beta állapot |
|---|---|
| Alkalmazás | **`6.0.0-beta.1`** |
| Language Pack Architecture | **`2.0`** |
| Firmware | **`5.1.0-beta.3`** |
| Direct API | **`1.1.0`** |
| Beta ág | `next/v5-rearchitecture` |
| Updater alias | `updater-beta` |
| Release típus | GitHub prerelease |
| Arduino board | `arduino:renesas_uno:unor4wifi` |
| OTA port | `65280` |
| LXC | Debian 13 / port `3000` |

### Nyelvek

| Nyelv | Állapot |
|---|---|
| English | beépített canonical fallback |
| Magyar (`hu`) | **1.0.0 published** |
| Deutsch (`de`) | **1.0.0 published** |
| Français (`fr`) | pending |

A letölthető nyelvi csomagok a `language-packs` ágon élnek, külön verziózhatók,
és új alkalmazásrelease nélkül frissíthetők.

### Aktuális kiadási dokumentumok

- [V6.0 Beta.1 release notes](docs/v5/V60_BETA2_RELEASE_NOTES.md)
- [V6.0 Beta.1 telepítési útmutató](docs/v5/V60_BETA2_INSTALLATION_GUIDE.md)
- [V6.0 Beta.1 release checklist](docs/v5/V60_BETA2_RELEASE_CHECKLIST.md)
- [Language Pack Architecture 2.0](docs/v6/LANGUAGE_PACK_ARCHITECTURE_2_0.md)
- [Gyökér release notes](RELEASE_NOTES_6.0.0-beta.2.md)

---

## Jelenlegi Stable kiadás

A `main` ág aktuális SSOT állapota:

| Komponens | Stable |
|---|---|
| Alkalmazás | **`5.8.0`** |
| Firmware | **`5.1.0`** |
| Direct API | **`1.0.0`** |
| Ág | `main` |
| Updater alias | `updater-stable` |
| Release típus | GitHub release |

A Beta és Stable verziók szándékosan eltérhetnek. A Beta alkalmazás új főverziója
nem emeli automatikusan a firmware vagy a Direct API főverzióját.

---

## V6.0 Beta.1 fő újdonságai

### Language Pack Architecture 2.0

- Az angol az egyetlen beépített runtime dictionary és a canonical kulcsmester.
- A további nyelveket a remote manifest dinamikusan teszi elérhetővé.
- A csomagok csak kérésre töltődnek le, majd lokálisan perzisztálódnak.
- A telepített nyelvek offline indulás és alkalmazás-újraindítás után is működnek.
- Manifest cache TTL: 24 óra.
- Pack maximum méret: 1 MiB.
- Raw JSON duplicate-key ellenőrzés történik `JSON.parse` előtt.
- Schema, nyelvkód, min/max app-kompatibilitás és SHA-256 ellenőrzés kötelező.
- A letölthető dictionary kulcskészlete pontosan egyezik a canonical angollal.
- Placeholder parity és nem üres érték kötelező minden kulcsnál.
- A telepítés staged + atomic, hibánál a last-known-good állapot marad aktív.
- A locale-feloldás központi és dinamikus BCP-47 kompatibilis.
- A Settings manager kezeli a Download, Installed, Current, Update available,
  Update, Reinstall, Remove, Pending, Working és Internet required állapotokat.

### Közös alkalmazásplatform

- Tauri v2 + Rust + React desktop kliens macOS, Windows és Linux rendszeren.
- Shared React UI iOS/iPadOS és Android platformon.
- Debian 13 Rust/Axum LXC runtime opcionális központi web/API rétegként.
- Direct Arduino mód továbbra is elsődleges és LXC nélkül is működik.
- Theme Engine 2.0 és Core UI 3.0.
- Dashboard, Statistics, Activity/Logs, Firmware, Schedules és Settings modulok.
- Stable/Beta updater csatornák.

### LED, schedule és időkezelés

- 3 × WS2812B LED-szalag.
- Fényerő, RGB-szín, effekt, sebesség és presetek.
- Legfeljebb 60 EEPROM schedule rekord.
- Schedule revision/checksum és tranzakciós írás.
- Import/export, backup/restore és konfliktusvédelem.
- Arduino-idő alapú programnézet.
- Europe/Vienna kompatibilis CET/CEST + DST és NTP időszinkron.

---

## Architektúra

```text
                         ┌──────────────────────────────┐
                         │ Arduino UNO R4 WiFi         │
                         │ Firmware 5.1.0-beta.3       │
                         │ Direct API 1.1.0            │
                         └──────────────┬───────────────┘
                                        │
                ┌───────────────────────┴────────────────────────┐
                │                                                │
                ▼                                                ▼
┌───────────────────────────────┐             ┌────────────────────────────────┐
│ Tauri V6 Beta client          │             │ Debian 13 Rust LXC             │
│ Application 6.0.0-beta.1     │             │ Rust / Axum backend            │
│                               │             │ React / Vite web UI            │
│ macOS / Windows / Linux       │             │ :3000                          │
│ iOS / iPadOS / Android       │             │ Arduino Direct API proxy       │
│ Shared React UI              │             │ Schedules / logs / LED control│
│ Language Pack Architecture 2 │             │ Self-update + rollback         │
│ Firmware / OTA management    │             │                                │
└───────────────────────────────┘             └────────────────────────────────┘
```

### Kapcsolati modell

A **Direct Arduino mód** az elsődleges kapcsolat. A kliens a privát API-prefixet és
az `X-Device-Key` eszközkulcsot használja. Az LXC opcionális központi runtime, nem
szükséges a közvetlen Arduino-vezérléshez.

---

## Direct API és biztonság

A Beta firmware jelenlegi Direct API verziója: **`1.1.0`**.

Fő biztonsági tulajdonságok:

- `X-Device-Key` fejlécalapú hitelesítés;
- query-string kulcsfallback tiltva;
- privát API-prefix;
- JSON body alapú módosító végpontok;
- tranzakciós schedule írás és readback;
- védett rendszer-végpontok;
- reboot utáni státusz- és Boot ID ellenőrzés.

Titkokat, Device Key-t, OTA-jelszót, `.env`, `update.env` vagy `secrets.h`
fájlt nem szabad commitolni.

---

## OTA frissítés

```text
Firmware artifact + SHA-256 ellenőrzés
        ↓
OTA prepare / exclusive mode
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

A Beta firmware jelenlegi verziója **`5.1.0-beta.3`**. Az alkalmazásrelease és
firmware-release külön folyamat; az alkalmazásrelease nem emeli automatikusan
a firmware verzióját.

---

## Debian 13 Rust LXC

Az opcionális LXC runtime:

- Rust + Axum backend;
- React/Vite web UI;
- közös `3000` web/API port;
- Arduino Direct API proxy;
- LED-, schedule-, firmware- és logkezelés;
- Stable/Beta csatornafüggő frissítés;
- staging + health gate + atomikus váltás;
- automatikus rollback.

### Alapértelmezett Proxmox profil

| Erőforrás | Alapérték |
|---|---:|
| CPU | 2 |
| RAM | 2048 MiB |
| Swap | 512 MiB |
| Disk | 8 GB |
| Network | DHCP |
| Bridge | `vmbr0` |
| LXC | unprivileged |
| Start bootkor | igen |

### Telepítés Proxmox hostról

```bash
bash -c "$(curl -fsSL 'https://raw.githubusercontent.com/LexyGuru/arduino-led-controller/next/v5-rearchitecture/deploy/proxmox/install-proxmox-lxc.sh')"
```

A telepítés után:

```text
http://LXC_IP:3000/
```

Diagnosztikai végpontok:

```text
/health/live
/health/ready
/api/v1/status
```

---

## Gyors kezdés fejlesztéshez

### Firmware

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  firmware/ArduinoLedController
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

cargo fmt --manifest-path desktop-tauri/src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

### Rust LXC

```bash
cargo fmt --manifest-path rust/Cargo.toml --all -- --check
RUSTFLAGS="-D warnings" cargo check --locked --manifest-path rust/Cargo.toml --workspace
RUSTFLAGS="-D warnings" cargo test --locked --manifest-path rust/Cargo.toml --workspace
npm run test:rust-lxc
```

---

## GitHub Actions és release-folyamat

A jelenlegi kanonikus workflow-készlet:

| Workflow | Szerep |
|---|---|
| `app-build.yml` | alkalmazás CI/build, release nélkül |
| `app-staging-build.yml` | NEXT/feature staging artifact build |
| `app-beta-release.yml` | kézzel indított Beta alkalmazás prerelease |
| `app-stable-release.yml` | kézzel indított Stable alkalmazásrelease |
| `firmware-build.yml` | UNO R4 WiFi firmware compile |
| `firmware-beta-release.yml` | Beta firmware prerelease + katalogizálás |
| `firmware-stable-release.yml` | Stable firmware release + katalogizálás |

Az alkalmazás- és firmware-release egymástól független.

### Jelenlegi Beta release sorrend

```text
next/v5-rearchitecture / 6.0.0-beta.1
        ↓
teljes regresszió + manuális QA
        ↓
HU/DE language-pack publication + remote validation
        ↓
Application Beta prerelease workflow
        ↓
kiadott build telepítési / updater / offline language smoke test
        ↓
következő Beta fejlesztési ciklus vagy későbbi Stable promóció
```

A Beta release **prerelease**, nem jelölhető latest stabil kiadásnak.

---

## Ágak

| Ág | Szerep |
|---|---|
| `next/v5-rearchitecture` | aktuális Beta alkalmazásvonal |
| `main` | stabil alkalmazásvonal |
| `language-packs` | alkalmazástól független nyelvi katalógus és packok |

---

## Dokumentáció

### Aktuális

- [V6.0 Beta.1 release notes](docs/v5/V60_BETA2_RELEASE_NOTES.md)
- [V6.0 Beta.1 telepítési útmutató](docs/v5/V60_BETA2_INSTALLATION_GUIDE.md)
- [V6.0 Beta.1 release checklist](docs/v5/V60_BETA2_RELEASE_CHECKLIST.md)
- [Language Pack Architecture 2.0](docs/v6/LANGUAGE_PACK_ARCHITECTURE_2_0.md)
- [Rust LXC architektúra](docs/v5/RUST_LXC_ARCHITECTURE.md)
- [Rust LXC üzemeltetés](docs/v5/RUST_LXC_OPERATIONS.md)
- [Shared frontend architektúra](docs/SHARED_FRONTEND_ARCHITECTURE.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

### Történeti kiadási dokumentáció

A korábbi V5 release notes, installation guide és release checklist fájlok a
repositoryban történeti snapshotként maradnak. A bennük szereplő verziók nem a
jelenlegi Beta állapotot jelentik.

---

## Platform Icon System

A desktop identity Stable és Beta csatornához külön Light/Dark ikonokat használ.
macOS-en az aktív Dock ikon az alkalmazáscsatorna és a helyi appearance alapján
váltható. Mobilon és más desktop platformokon a generált platformikonok használatosak.

---

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg. Külső
terjesztés előtt külön `LICENSE` fájl szükséges.
