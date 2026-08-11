# Arduino LED Controller V5

> *Direct Arduino Control & Automation*

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Firmware Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-beta-release.yml)
[![V5 Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml)

<p align="center">
  <img src="docs/assets/v5-neon-panel-presentation.png" alt="Arduino LED Controller V5 – Neon Panel" />
</p>

Többplatformos LED-vezérlő rendszer Arduino UNO R4 WiFi és három WS2812B LED-szalag számára. A V5 elsődleges működési módja továbbra is a közvetlen Direct API v1 kapcsolat, de a Beta.9 már teljes Debian 13 Rust LXC szervert is tartalmaz React/Vite webfelülettel, automatikus frissítéssel és rollbackkel.


## Beta.10 release readiness

**Aktuális Beta alkalmazás:** `5.0.0-beta.10`
**Párosított firmware:** `5.0.0-beta.7`
**Direct API:** `1.0.0`

Aktuális kiadási dokumentumok:

- [Beta.10 release notes](docs/v5/BETA10_RELEASE_NOTES.md)
- [Beta.10 telepítési útmutató](docs/v5/BETA10_INSTALLATION_GUIDE.md)
- [Beta.10 release checklist](docs/v5/BETA10_RELEASE_CHECKLIST.md)

A Beta.1–Beta.8 dokumentumok történeti release-dokumentációként maradnak a repositoryban.

## Aktuális verziók és fejlesztési állapot

| Elem | Verzió / állapot |
|---|---|
| Alkalmazás | `5.0.0-beta.10` |
| Firmware | `5.0.0-beta.7` |
| Direct API | `1.0.0` |
| Beta ág | `next/v5-rearchitecture` |
| Stabil ág | `main` |
| LXC operációs rendszer | Debian 13 |
| LXC backend | Rust + Axum |
| LXC frontend | React + Vite |
| LXC web/API port | `3000` |
| Automatikus frissítés | 6 óránként, systemd timer |
| Rollback | automatikus, health/web gate |
| Megőrzött LXC release-ek | 3 |

A Beta.9 a V5 desktop, Direct API, Debian 13 Rust LXC, React/Vite webfelület és az önfrissítő üzemeltetési réteg közös integrációs állapota. A hozzá tartozó Arduino firmware `5.0.0-beta.7`; a Direct API verziója `1.0.0`.

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
- magyar, angol és német desktop felület;
- System / Light / Dark mód és V5 témarendszer;
- helyi műveleti audit és Tauri auditkonzol;
- macOS Keychain, Windows Credential Manager és Linux Secret Service támogatás;
- Debian 13 Rust LXC szerver;
- React/Vite LXC web UI;
- Stable/Beta csatornafüggő automatikus LXC-frissítés;
- atomikus release-váltás és automatikus rollback.

## Architektúra

```text
                         ┌─────────────────────────────┐
                         │ Arduino UNO R4 WiFi         │
                         │ Firmware 5.0.0-beta.7       │
                         │ Direct API v1               │
                         │ X-Device-Key                │
                         └──────────────┬──────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                │                                               │
                ▼                                               ▼
┌───────────────────────────────┐             ┌────────────────────────────────┐
│ Tauri V5 Desktop              │             │ Debian 13 Rust LXC             │
│                               │             │                                │
│ Direct Arduino API            │             │ Rust / Axum backend            │
│ Theme Engine                  │             │ React / Vite web UI            │
│ Audit                         │             │ :3000                           │
│ Firmware / OTA                │             │ Direct API proxy               │
│ Credential Store              │             │ Schedules / logs / LED control│
└───────────────────────────────┘             │ Self-update + rollback         │
                                              └────────────────────────────────┘
```

A Direct Arduino módhoz nem szükséges alkalmazás-felhasználónév vagy szerverjelszó. A kliens a privát API-prefixet és az `X-Device-Key` eszközkulcsot használja.

## Debian 13 Rust LXC

A Beta.9 teljes headless LXC szervert tartalmaz Debian 13-hoz. A szerver ugyanazon a `3000`-es porton szolgálja ki a React webfelületet és a Rust API-t.

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

Az Advanced telepítési mód külön CTID, hostname, CPU, RAM, swap, disk, storage, bridge, VLAN és IPv4 paraméterezést is támogat.

### Beta telepítés Proxmox hostról

```bash
bash -c "$(curl -fsSL 'https://raw.githubusercontent.com/LexyGuru/arduino-led-controller/next/v5-rearchitecture/deploy/proxmox/install-proxmox-lxc.sh')"
```

A telepítő bekéri:

- Stable vagy Beta csatorna;
- Default vagy Advanced profil;
- Arduino helyi IP / host;
- Arduino HTTP port;
- Arduino private API-prefixet, `/api/v1` nélkül;
- Arduino Device Key-t;
- Debian root jelszót a tty / Proxmox Console belépéshez.

A telepítés után:

```text
http://LXC_IP:3000/
```

a React/Vite kezelőfelületet adja, míg például:

```text
http://LXC_IP:3000/health/live
http://LXC_IP:3000/health/ready
http://LXC_IP:3000/api/v1/status
```

a Rust szerver és az Arduino kapcsolat állapotát mutatja.

## LXC automatikus frissítés

Az LXC saját systemd updaterrel rendelkezik.

```text
Beta   -> next/v5-rearchitecture
Stable -> main
```

Az updater:

- 6 óránként ellenőrzi a kiválasztott GitHub ág remote HEAD-jét;
- legfeljebb 20 perc véletlen késleltetést alkalmaz;
- egyszerre csak egy updater példányt enged;
- új commitnál külön staging könyvtárba tölti le a forrást;
- lefuttatja a React/Vite buildet;
- lefuttatja a Rust teszteket és release buildet;
- új release könyvtárat hoz létre;
- atomikusan váltja a `current` symlinket;
- ellenőrzi a `/health/live` végpontot és a web UI `/` útvonalat;
- hiba esetén automatikusan visszaáll az előző release-re;
- az Arduino `/health/ready` állapotát diagnosztikaként kezeli, nem rollback feltételként;
- alapból az utolsó három release-t tartja meg.

### Updater ellenőrzése az LXC-ben

```bash
systemctl status arduino-led-controller-update.timer
systemctl list-timers arduino-led-controller-update.timer
```

Kézi frissítésellenőrzés:

```bash
systemctl start arduino-led-controller-update.service
```

Updater napló:

```bash
journalctl -u arduino-led-controller-update.service --no-pager -n 200
```

## LXC webfelület

A Beta.9 LXC web UI fő nézetei:

- Áttekintés;
- LED vezérlés;
- Heti program;
- Naplók;
- Firmware;
- Rendszer.

A React frontend nem használ Tauri IPC-t. A böngésző ugyanazon az originen keresztül éri el az Axum `/api/v1/*` route-jait.

## Megjelenés és audit

A V5 Theme Engine központi design tokeneket és perzisztált megjelenési beállításokat használ:

- rendszer szerinti, világos és sötét mód;
- Arctic és Midnight téma;
- több kiemelőszín;
- kompakt, kényelmes és érintésbarát sűrűség;
- állítható lekerekítés, animáció és glass effekt.

A Logok oldalon:

- az Arduino-konzol az eszköz naplóit mutatja;
- a Legutóbbi műveletek a helyi LED-, schedule-, időszinkron-, firmware- és OTA-műveleteket mutatja;
- a Tauri auditkonzol a helyi alkalmazás- és meglévő hálózati eseményeket mutatja.

## Firmware és Direct API

A jelenlegi Beta firmware: `5.0.0-beta.7`. A Direct API verziója `1.0.0`.

Biztonsági tulajdonságok:

- fejlécalapú `X-Device-Key`;
- query-string kulcsfallback tiltva;
- privát API-prefix;
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
- világos és sötét témában is olvasható konzolt és rollback-listát használ.

Az OTA-jelszó nem kerülhet forráskódba vagy konfigurációs exportba.

### Beta firmware OTA Exclusive Mode

A `5.0.0-beta.7` firmware OTA alatt kizárólag a Wi-Fi kapcsolatot, az ArduinoOTA motort és a LED Matrix visszajelzést hagyja aktívan; a többi alkalmazás-alrendszer szünetel a flash-finalizálás alatt. Ha az `/api/v1/ota/prepare` után nem csatlakozik feltöltő a 30 másodperces ablakban, a firmware automatikusan kilép az Exclusive Mode-ból és visszaállítja a normál szolgáltatásokat. Az OTA folyamat nem törli és nem írja újra a schedule rekordokat.

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

### Rust LXC tesztek

```bash
cargo fmt --manifest-path rust/Cargo.toml --all -- --check
RUSTFLAGS="-D warnings" cargo check --locked --manifest-path rust/Cargo.toml --workspace
RUSTFLAGS="-D warnings" cargo test --locked --manifest-path rust/Cargo.toml --workspace

npm run test:rust-lxc
```

## Ágak és kiadás

- `main`: stabil, védett ág.
- `next/v5-rearchitecture`: Beta integrációs ág és jelenlegi V5 fejlesztési ág.
- `.github/workflows/firmware-beta-release.yml`: dedikált Beta firmware prerelease.
- `.github/workflows/beta-release.yml`: teljes V5 alkalmazás prerelease.
- A prerelease nem jelölhető latest stabil kiadásnak.

A README tetején lévő Beta badge-ek közvetlenül a GitHub Actions workflow státuszát használják. Sikeres workflow esetén a GitHub státuszbadge sikeres állapotot, hibánál sikertelen állapotot jelez.

## Dokumentáció

- [Rust LXC architektúra](docs/v5/RUST_LXC_ARCHITECTURE.md)
- [Rust LXC üzemeltetés és konfiguráció](docs/v5/RUST_LXC_OPERATIONS.md)
- [Beta.7 UI Freeze történeti állapot](docs/v5/BETA7_UI_FREEZE.md)
- [Beta.7 Markdown-audit](docs/v5/MARKDOWN_AUDIT_BETA7.md)
- [Firmware áttekintés](firmware/README.md)
- [Direct API v1](docs/firmware/DIRECT_API_V1.md)
- [EEPROM tárolás](docs/firmware/EEPROM_STORAGE.md)
- [OTA frissítés](docs/firmware/OTA_UPDATE.md)
- [Biztonsági szabályok](SECURITY.md)
- [Közreműködés](CONTRIBUTING.md)
- [Változásnapló](CHANGELOG.md)

A Beta.6/Beta.7 dokumentumok történeti kiadási dokumentumok; a bennük szereplő verziószámokat nem kell Beta.9-ra átírni.

## Biztonság

Ne nyiss közvetlen internetes portot az Arduino API vagy OTA számára. Távoli eléréshez HTTPS reverse proxy és érvényes TLS chain ajánlott. Titkokat, API-kulcsot, OTA-jelszót, `.env`, `update.env` vagy `secrets.h` fájlt soha ne commitolj.

A Proxmox installer a Device Key-t interaktívan kéri be. Az LXC runtime konfigurációja az `/etc/arduino-led-controller/` könyvtárban marad, és nem kerül a Git repositoryba.

## Dedikált firmware release

A `v5.0.0-beta.X` alkalmazásrelease-ek az alkalmazás- és LXC-csomagokat kezelik. A Beta firmware-ek, SHA-256 fájlok és rollback katalógus a dedikált firmware Beta release folyamat részei.

## Licenc

A repository licencfeltételeit a projekt tulajdonosa határozza meg. Külső terjesztés előtt külön `LICENSE` fájl szükséges.


## Beta.9 Shared Frontend

A `5.0.0-beta.10` egyetlen kanonikus React UI-forrást használ macOS, Windows, Linux, iOS, iPadOS, Android és Proxmox/Debian LXC célokra. Részletek: `docs/SHARED_FRONTEND_ARCHITECTURE.md` és `docs/BETA9_SHARED_FRONTEND_MIGRATION.md`.

<!-- BETA9_CRITICAL_MOBILE_CLOCK_V186 -->
### Beta.9 – critical mobile/clock hardening

The shared Beta.9 frontend uses one canonical theme engine across desktop, LXC
and mobile. Mobile connection credentials are backed by native secure stores on
iOS and Android. Firmware schedule execution uses the corrected local clock
reconciliation path and refreshes its authoritative NTP clock every 10 minutes
to bound long-running clock drift. Related scheduler, credential, mobile-theme
reachability and regression contracts are part of the canonical test chain.



## Beta.10 – aktuális fejlesztési állapot

- Alkalmazás: `5.0.0-beta.10`
- Firmware: `5.0.0-beta.7`
- Direct API: `1.0.0`
- Branch: `next/v5-rearchitecture`
- UNO R4 Matrix/NeoPixel stabilizálás: hardveren validálva
- Mobil/iOS credential, theme és Xcode 27 kompatibilitási kör: beépítve
- Arduino clock/scheduler stabilizálás: beépítve
- Animált WS2812 effektek: átmenetileg szünetelnek az interrupt-barát backend elkészültéig

Részletes kiadási jegyzet: `RELEASE_NOTES_5.0.0-beta.10.md`.
Firmware kiadási jegyzet: `firmware/RELEASE_NOTES_5.0.0-beta.7.md`.

## V5 Platform Icon System

The V5 desktop identity uses four canonical application icon masters:

| Channel | Light appearance | Dark appearance |
| --- | --- | --- |
| Stable | Stable Light | Stable Dark |
| Beta | Beta Light | Beta Dark |

The Beta artwork intentionally uses a large `BETA` badge so the channel remains
recognizable at Dock/Finder sizes.

### Automatic macOS icon selection

The active icon is selected from two independent signals:

1. **Application version** — versions containing `beta` use the Beta artwork;
   other versions use Stable artwork.
2. **Mac local time** — 07:00–18:59 uses the Light/day master; 19:00–06:59
   uses the Dark/night master.

The Tauri frontend synchronizes the icon on startup and rechecks the Mac's
local time once per minute. A system-theme change is also used as an extra
resync trigger. The macOS backend applies the selected artwork to the Dock
icon through AppKit.

```text
Stable + Light -> Stable Light
Stable + Dark  -> Stable Dark
Beta   + Light -> Beta Light
Beta   + Dark  -> Beta Dark
```

The generated Tauri platform icon set remains the startup/fallback icon. Mobile
and non-macOS platforms keep their normal generated icon assets.
