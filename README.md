<!-- CURRENT_BETA_RELEASE_BEGIN -->
## Current Beta release

- Application: `6.0.0-beta.7`
- Firmware: `5.1.0-beta.4`
- Direct API: `1.2.0`
- Detailed release notes: `docs/v5/V60_BETA7_RELEASE_NOTES.md`
- Root release notes: `RELEASE_NOTES_6.0.0-beta.7.md`
- Installation guide: `docs/v5/V60_BETA7_INSTALLATION_GUIDE.md`
- Release checklist: `docs/v5/V60_BETA7_RELEASE_CHECKLIST.md`
<!-- CURRENT_BETA_RELEASE_END -->

# Arduino LED Controller V6

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.7`
Current firmware: `5.1.0-beta.4`
Current Direct API: `1.2.0`
<!-- CURRENT_VERSION_SSOT_END -->

<!-- CURRENT_RELEASE_DOCS_SSOT_BEGIN -->
- Release notes: `docs/v5/V60_BETA7_RELEASE_NOTES.md`
- Installation guide: `docs/v5/V60_BETA7_INSTALLATION_GUIDE.md`
- Release checklist: `docs/v5/V60_BETA7_RELEASE_CHECKLIST.md`
- Root release notes: `RELEASE_NOTES_6.0.0-beta.7.md`
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

> **Arduino LED Controller 6.0.0-beta.7 — Performance & Observability**

| Komponens | Aktuális Beta állapot |
|---|---|
| Alkalmazás | **`6.0.0-beta.7`** |
| Firmware | **`5.1.0-beta.4`** |
| Direct API | **`1.2.0`** |
| Language Pack Architecture | **`2.1`** |
| Language catalog | **`2.1.0`** |
| Beta ág | `next/v5-rearchitecture` |
| Updater alias | `updater-beta` |
| Release típus | GitHub prerelease |
| Arduino board | `arduino:renesas_uno:unor4wifi` |
| OTA port | `65280` |
| LXC | Debian 13 / port `3000` |

### Nyelvek

| Nyelv | Állapot |
|---|---|
| English (`en`) | beépített canonical fallback |
| Magyar (`hu`) | **1.1.0 published** |
| Deutsch (`de`) | **1.1.0 published** |
| Français (`fr`) | **1.0.0 published** |
| Español (`es`) | **1.0.0 published** |
| Italiano (`it`) | **1.0.0 published** |
| Português (`pt`) | **1.0.0 published** |
| Українська (`uk`) | **1.0.0 published** |
| Polski (`pl`) | **1.0.0 published** |
| Русский (`ru`) | **1.0.0 published** |
| Čeština (`cs`) | **1.0.0 published** |
| Română (`ro`) | **1.0.0 published** |
| 简体中文 (`zh-CN`) | **1.0.0 published** |
| 日本語 (`ja`) | **1.0.0 published** |
| 한국어 (`ko`) | **1.0.0 published** |

Összesen **15 támogatott nyelv** van: az angol beépített canonical fallback, további **14 letölthető csomag** a `language-packs` ágról. A language packok az alkalmazástól függetlenül verziózhatók és új alkalmazásrelease nélkül frissíthetők.

### Aktuális

- [V6.0 Beta.7 release notes](docs/v5/V60_BETA7_RELEASE_NOTES.md)
- [V6.0 Beta.7 telepítési útmutató](docs/v5/V60_BETA7_INSTALLATION_GUIDE.md)
- [V6.0 Beta.7 release checklist](docs/v5/V60_BETA7_RELEASE_CHECKLIST.md)
- [Gyökér Beta.7 release notes](RELEASE_NOTES_6.0.0-beta.7.md)
- [Language Pack Architecture 2.1](docs/v6/LANGUAGE_PACK_ARCHITECTURE_2_0.md)
- [Rust LXC architektúra](docs/v5/RUST_LXC_ARCHITECTURE.md)
- [Rust LXC üzemeltetés](docs/v5/RUST_LXC_OPERATIONS.md)
- [Shared frontend architektúra](docs/SHARED_FRONTEND_ARCHITECTURE.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

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

<!-- CURRENT_ARCHITECTURE_REALITY_BEGIN -->
## Jelenlegi architektúra

- **Desktop / mobil UI:** React/Vite shared frontend, Tauri v2 desktop runtime.
- **LXC:** Debian 13 Rust LXC, Rust/Axum backend és React/Vite web UI.
- **Arduino:** UNO R4 WiFi, firmware `5.1.0-beta.4`, Direct API `1.2.0`.
- **Beta ág:** `next/v5-rearchitecture`.
- **Stable ág:** `main`.
- **Nyelvi csomagok:** `language-packs`.

<!-- CURRENT_ARCHITECTURE_REALITY_END -->

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
next/v5-rearchitecture / 6.0.0-beta.7
        ↓
teljes regresszió + manuális QA
        ↓
release reality + SSOT ellenőrzés
        ↓
Application Beta prerelease workflow
        ↓
GitHub-built firmware/app artifact runtime teszt
        ↓
következő Beta fejlesztési ciklus vagy későbbi Stable promóció
```

A Beta release **prerelease**, nem jelölhető latest stabil kiadásnak.

---

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

## 6.0.0-beta.7 — Settings & startup experience

Beta.5 finalizes the cross-platform Settings information architecture and the Visual 3.1 startup experience.

- **Settings:** General · Connection and authentication · Updates · Arduino and LED hardware
- **Update navigation:** update indicators deep-link directly to Updates
- **Languages:** Language Pack Architecture 2.1, 15 total languages, existing 14 downloadable packs remain compatible
- **Startup:** redesigned responsive command-card layout with long-language-safe wrapping
- **Firmware:** remains `5.1.0-beta.4`
- **Direct API:** remains `1.2.0`

Release notes: [`RELEASE_NOTES_6.0.0-beta.7.md`](RELEASE_NOTES_6.0.0-beta.7.md)
Detailed technical notes: [`docs/v5/V60_BETA7_RELEASE_NOTES.md`](docs/v5/V60_BETA7_RELEASE_NOTES.md)
Installation guide: [`docs/v5/V60_BETA7_INSTALLATION_GUIDE.md`](docs/v5/V60_BETA7_INSTALLATION_GUIDE.md)


## 6.0.0-beta.7 hotfix candidate

Visual 3.1 health-orbit text containment and recovered mobile startup-error suppression. Firmware remains `5.1.0-beta.4`.


## 6.0.0-beta.7 Performance + Observability candidate

Structured diagnostics/logging foundation. Firmware `5.1.0-beta.4`, Direct API `1.2.0`.

### Beta.7 canonical documentation

- Detailed release notes: [`docs/v5/V60_BETA7_RELEASE_NOTES.md`](docs/v5/V60_BETA7_RELEASE_NOTES.md)
- Installation guide: [`docs/v5/V60_BETA7_INSTALLATION_GUIDE.md`](docs/v5/V60_BETA7_INSTALLATION_GUIDE.md)
- Release checklist: [`docs/v5/V60_BETA7_RELEASE_CHECKLIST.md`](docs/v5/V60_BETA7_RELEASE_CHECKLIST.md)
- Publication summary: [`RELEASE_NOTES_6.0.0-beta.7.md`](RELEASE_NOTES_6.0.0-beta.7.md)
