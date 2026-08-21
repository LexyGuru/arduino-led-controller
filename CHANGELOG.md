# 5.8.0-beta.2 — Mobile schedule and topology feedback test build

- Separate mobile schedule workspace with all seven weekdays visible.
- Full-width selected-day event cards and full-viewport mobile editor.
- LED topology save feedback with old/new counts and firmware revision.
- Firmware topology success/error logging and localization.
- Current release/version contracts migrated from fixed Beta.1 literals to canonical dynamic identity.
- Application: `5.8.0-beta.2`.
- Firmware: `5.1.0-beta.2`.
- Direct API: `1.0.0`.
- Test-build source publication only; no GitHub Release or tag created.

# 5.8.0-beta.1 — Beta.1 development

- Dynamic per-strip LED topology foundation.
- Firmware development version 5.1.0-beta.1.
- Persistent A/B LED counts, fixed physical pins and LX001/LX002/LX003 identities.
- Direct API + Settings + Visual 3.1 topology wiring.
- Local test candidate only; no release published.

# 5.7.0-beta.5 — Beta.5

- Unified the duplicate OTA/OTA2 user-facing firmware update surfaces into the canonical OTA2 flow.
- Preserved native Rust OTA, macOS Terminal fallback, Direct API confirmation and schedule-persistence verification.
- Added explicit terminal `100% / Kész` completion after successful OTA2 post-verification.
- Migrated active Visual 3.1 OTA contracts and Beta release identity to `5.7.0-beta.5`.
- Firmware remains `5.0.1-beta.1`.

# 5.7.0-beta.4 — Beta.4

- LXC server-side settings persistence and immediate autosave.
- Firmware `5.0.1-beta.1` Beta.
- Direct API `1.0.0`.
- OTA LED feedback: blue in-progress latch, green successful reboot, red error.
- Beta application and firmware release metadata synchronized.

# 5.7.0-beta.3 — 2026-08-20

### Firmware channel and LXC OTA hotfix
- Make the selected firmware Stable/Beta channel authoritative through OTA artifact resolution.
- Preserve native Rust OTA transport and macOS Terminal fallback contracts.
- Align the Beta.3 release gate metadata with the active application version.
- Consolidate LXC firmware channel propagation and OTA control-token recovery.
- Keep Arduino OTA password server-side in the LXC runtime.
- Firmware remains `5.0.0` Stable.
- Direct API remains `1.0.0`.
- Theme Engine remains `2.0`.
- Core UI remains `3.0`.

# 5.7.0-beta.1 — 2026-08-19

### Core UI 3.0 Foundation
- Start 5.7 UI/UX generation.
- Theme Engine 2.0 preserved; Core UI 3.0.
- Firmware 5.0.0 Stable and Direct API 1.0.0 unchanged.

# 5.6.1 — 2026-08-19

### Final Stable consolidation
- Consolidate current MAIN Stable-only release fixes with validated Beta.6 P0/P1 changes.
- Promote application `5.6.1` to Stable channel and `updater-stable`.
- Promote firmware identity from `5.0.0-beta.10` to `5.0.0` with no behavioral feature change.
- Preserve release asset validation and GitHub-hosted Linux APT mirror recovery.
- Close the V5 architecture/release stabilization cycle after Stable runtime verification.

### Versions
- Application: `5.6.1`
- Firmware: `5.0.0`
- Direct API: `1.0.0`

# 5.6.1-beta.6 — 2026-08-19

### P1 — APT Mirror Recovery
- Normalize GitHub-hosted Ubuntu Azure mirror references before APT.
- Add bounded process-tree timeout/kill and residual apt cleanup.
- Force IPv4 and tighten APT network timeout/retry behavior.
- Verify required Tauri Linux dependencies after installation.

### Versions
- Application: `5.6.1-beta.6`
- Firmware: `5.0.0-beta.10` unchanged
- Direct API: `1.0.0` unchanged

# 5.6.1-beta.5 — 2026-08-19

### P1 — Release Asset Contract
- Fixed missing `VERIFIED_VERSION` wiring in Beta and Stable application release asset verification.
- Added diagnostic release asset class cardinality checks.
- Added Beta/Stable semantic asset-contract parity regression.

### Versions
- Application: `5.6.1-beta.5`
- Firmware: `5.0.0-beta.10` unchanged
- Direct API: `1.0.0` unchanged

# 5.6.1-beta.4 — 2026-08-19

### P1 — Release Runner Resilience
- Replaced duplicated raw Linux/Tauri APT installs with one shared CI installer.
- Added bounded retries, network timeouts, dpkg lock timeout, noninteractive mode, command timeout and 15-minute workflow step timeout.
- Hardened app build, staging, Beta and Stable release Linux dependency paths.

### Versions
- Application: `5.6.1-beta.4`
- Firmware: `5.0.0-beta.10` unchanged
- Direct API: `1.0.0` unchanged

# 5.6.1-beta.3 — 2026-08-19

### P0 architecture consolidation
- Forward-synced the channel-aware Device Key gate while preserving Beta identity.
- Made `release-versions.json` the canonical application release SSOT.
- Consolidated current/regression/history test architecture.
- Removed source-shape and duplicated workflow version/branch contracts from current gates.

### Release discipline
- Every GitHub application publication now requires a new application version.
- Added complete Beta.3 release notes, installation guide, checklist and release-version policy.
- Firmware remains `5.0.0-beta.10`; Direct API remains `1.0.0`.

# 5.6.1-beta.2 — 2026-08-18

### Device Key transport recovery
- Unified the Device Key minimum length across secure credential storage and HTTP `X-Device-Key` transport.
- Valid printable-ASCII Device Keys of 16–64 characters are accepted consistently.
- HTTP header safety remains strict.
- Firmware remains `5.0.0-beta.10`; Direct API remains `1.0.0`.

# 5.6.1-beta.1 — 2026-08-18

### Release/channel identity
- Running application build identity is separated from the selected application update channel.
- Installed firmware identity is separated from the selected firmware update channel.
- Stable/Beta firmware catalogs are strictly channel-filtered.

### Startup and diagnostics
- Real startup warnings persist on Dashboard after the startup screen closes.
- Recovered healthy macOS Keychain/bootstrap noise no longer dominates Latest Error.
- Startup card scrolling is disabled.
- Persistent Sidebar application-update visibility was added.

### GitHub Actions cleanup
- Canonical workflow set reduced to seven clear application/firmware build and release workflows.
- Removed `beta-release.yml` and `tauri-desktop.yml`.
- Renamed staging workflow to `app-staging-build.yml`.
- Stable application publishing is self-contained in `app-stable-release.yml`.
- Beta firmware publishing reuses `firmware-build.yml`.

### Versions
- Application: `5.6.1-beta.1`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Current Stable application before promotion: `5.1.0`
- Planned Stable promotion after accepted Beta: application `5.6.1`, firmware `5.0.0`

# 5.6.0-beta.2

### Theme Engine 3.0
- 12 factory themes plus custom theme profiles.
- Expanded accent palette and material / gradient / contrast dimensions.
- JSON import/export, clone-current workflow and contrast validation.
- Shared desktop/mobile/web-LXC ThemeProvider with v1/v2 storage migration.
- Frozen Beta.7 macOS OTA contract remains untouched.

# 5.5.0-beta.1

## V5.5 — Next Generation UI & Shared Runtime — 2026-08-12

### Theme Engine 2.0
- Teljes preset galéria, v1 → v2 migráció, glass/glow/motion és perzisztált megjelenés.

### Core UI 1.5
- Új reszponzív Sidebar, Topbar és mobil BottomNav alkalmazáshéj.

### Dashboard 2.0 / Statistics 1.0
- Valós runtime snapshotok, schedule összesítések és audit-alapú aktivitás.
- Nincs szintetikus/fake history.

### Activity & Logs 2.0
- Egységes Arduino/audit/network log szűrés és export.

### Management UI 2.0
- Újratervezett Firmware, Schedules és Settings felületek.

### App Update Center 1.0
- Stable/beta csatorna, manuális ellenőrzés, 6 órás automatikus check és külön error state.

### Shared Desktop / Mobile / LXC Runtime
- Közös React frontend forrás minden célplatformhoz.
- LXC runtime isolation: natív Tauri core/window API csak valódi Tauri runtime-ban aktiválódik.
- Javítva a `window.__TAURI_INTERNALS__.metadata` böngészős startup crash.

### Verziók
- Application: `5.5.0-beta.1`
- Firmware: `5.0.0-beta.7`
- Direct API: `1.0.0`
- Stable baseline: `5.0.0`

# 5.0.0-beta.9

## 5.0.0-beta.9

- Canonical shared React desktop/LXC release documentation.
- Beta.9-only GitHub prerelease documentation assets.
- Rust LXC canonical runtime and transactional updater documentation.
- Current Beta release contracts separated from historical Beta snapshot tests.
- Historical release tests remain available via `npm run test:release-history`.


- Shared React frontend for desktop, mobile and LXC.
- Full LXC firmware release selection and OTA cancel.
- Browser schedule import/export.
- Application 5.0.0-beta.9; firmware remains 5.0.0-beta.6.
- README and architecture documentation updated.

## [5.0.0-beta.7] - 2026-08-06

### Alkalmazás

- Beta.7 UI-overhaul, Theme Engine és egységes Design System.
- Tauri auditkonzol és csatornahelyes firmware-katalógus.
- Schedule backup, restore és teljes törlés.
- macOS UNO R4 helyi `arduinoOTA` Terminal útvonal.

### Firmware 5.0.0-beta.3

- Direct API `1.0.0`-only router.
- Legacy firmware endpointok és JSON-ágak eltávolítása.
- OTA maintenance mód.
- BIN méret: `118516` bájt.

### Validáció

- Repository-validáció, teljes Node-regresszió és UNO R4 fordítás sikeres.

## 5.0.0-beta.6 — Firmware-katalógus és workflow szétválasztás

## [Unreleased] – Beta.7 UI Freeze

- központi Theme Engine System / Light / Dark móddal;
- Arctic és Midnight téma, kiemelőszínek, sűrűség és lekerekítés;
- perzisztált megjelenési beállítások;
- helyi Tauri műveleti audit legfeljebb 500 bejegyzéssel;
- Event Bus helyett Tauri auditkonzol a Direct Arduino felületen;
- LED-, schedule-, időszinkron-, firmware- és OTA-műveletek auditálása;
- világos OTA-konzol és firmware rollback kontraszt;
- auditált Dashboard időszinkron;
- Beta.7 UI Freeze és dokumentációs contractok;
- a `LedStrip` azonosítója `id`, nem `index`.

A Beta.7 még fejlesztés alatt áll, és nem nyilvános kiadás.

- Azonos firmware-verziók deduplikálása a Tauri katalógusban.
- Egyértelmű Firmware előtag, telepített/legújabb/korábbi jelölések.
- Szemantikus verzió-összehasonlítás rollback döntéshez.
- Teljes alkalmazásrelease manuális indítása.
- Külön firmware-only hotfix workflow meglévő prerelease frissítésére.

# Változásnapló

## Firmware 4.3.0-beta.4 — scheduler/NTP hotfix — 2026-08-04

- Megbízható NTP újrapróbálás és Wi-Fi visszatérés utáni azonnali szinkron.
- NTP kísérlet-, hiba- és siker-számlálók a státuszban.
- Aktuális epoch, helyi nap/óra/perc és scheduler futási diagnosztika.
- A kézi LED-felülbírálás időszinkron nélkül sem maradhat végtelenül aktív.
- Sikeres első NTP-szinkron és schedule-mentés után azonnali reconcile.
- LED-enként elérhető a kiválasztott schedule index és blokkolási ok.

## 5.0.0-beta.6 / firmware 4.3.0-beta.4 — 2026-08-03

### Többnyelvű stabilizáció

- Teljes magyar, angol és német desktop- és mobilfelület.
- Központi i18n réteg perzisztált nyelvválasztással és rendszer-nyelv felismeréssel.
- A kapcsolat-, LED-, schedule-, firmware-, OTA-, siker-, hiba- és státuszüzenetek központi fordítási kulcsokat használnak.
- Új forrásintegritási, kulcsparitási, hardcoded UI és final hook i18n auditok.
- A mobilos profilmentés és OTA-letiltás contractjai i18n-alapúak.

### Kiadás és dokumentáció

- Alkalmazásverzió: `5.0.0-beta.6`.
- Firmware változatlan: `4.3.0-beta.4`.
- Direct API változatlan: `1.0.0`.
- Frissített README, CONTRIBUTING és SECURITY dokumentáció.
- Új Beta.5 telepítési útmutató, release notes és checklist.
- Frissített workflow-, artifact-, staging- és verziócontractok.

## 5.0.0-beta.4 / firmware 4.3.0-beta.4 — 2026-08-01

### Direct schedule-szinkron

- Az Arduino Direct API lett a heti időzítés hiteles elsődleges adatforrása; V5/Node/LXC szerver nem szükséges.
- Teljes, lapozott, legfeljebb 60 rekordos letöltés `count` és változatlan `revision` ellenőrzéssel.
- A helyi cache csak sikeres tranzakció, commit és teljes readback után frissül.
- Mentés és törlés csak teljes, ellenőrzött Arduino-snapshotból engedélyezett.
- A valóban üres LED-műveletű, de érvényes rekordok megmaradnak és kezelhetők.
- A hiányzó `apply` jelzővel, de megmaradt LED-adatokkal rendelkező örökölt rekordok helyreállnak, majd a következő sikeres mentéskor normalizálódnak.
- A dashboard külön mutatja az Arduino és a betöltött szerkesztési lista rekordszámát, valamint a szinkron állapotát.

### Megbízhatóság és kiadás

- A React réteg megvárja a Direct schedule Promise-okat, ezért a hibák nem maradnak néma háttérműveletek.
- Új Direct schedule regressziós teszt és architektúra-dokumentáció.
- Firmware 4.3.0-beta.4 gyorsítás: kisebb HTTP timeoutok, 512 bájtos válaszchunk és 8 ms settle delay.
- GitHub Stable/Beta firmware-katalógus, csatornahelyes visszaállítás és schedule teljes törlés előtti automatikus backup.
- Az alkalmazás verziója `5.0.0-beta.4`; a firmware változatlanul `4.3.0-beta.4`, Direct API `1.0.0`.
- Beta.3 telepítési útmutató, release notes, checklist és frissített GitHub prerelease workflow.

## 5.0.0-beta.3 / firmware 4.3.0-beta.4 — 2026-07-31

### Direct kapcsolat és biztonság

- Szerkeszthető helyi IP/hostname és távoli DDNS célpont, külön API-portokkal és automatikus fallbackkel.
- Profilonkénti `X-Device-Key` és OTA-jelszó a macOS Keychain, Windows Credential Manager vagy Linux Secret Service tárban.
- Régi plaintext credentialök automatikus migrációja és eltávolítása a konfigurációból.

### Frissítés és OTA

- Stable/Beta GitHub Release kiválasztás és platform-specifikus alkalmazásartifact felismerés.
- Firmware BIN cache és kötelező SHA-256 újraellenőrzés.
- Kézzel megadható `arduinoOTA` útvonal, OTA-host, port és timeout.
- Megszakítható OTA, élő konzol, Boot ID változás és schedule revision/checksum persistence kapu.

### Kiadás

- Az alkalmazás verziója `5.0.0-beta.3`; a párosított firmware továbbra is `4.3.0-beta.4`, Direct API `1.0.0`.
- Új Beta.2 telepítési útmutató, release notes és checklist.
- Gépileg olvasható Beta channel manifest az alkalmazás- és firmware-artifactok kompatibilitási adataival.

## 5.0.0-beta.3 / firmware 4.3.0-beta.4 — 2026-07-31

### Firmware

- Direct API `1.0.0` véglegesítése.
- `X-Device-Key` fejlécalapú hitelesítés; query fallback véglegesen tiltva.
- JSON body alapú módosító API-k.
- Konfiguráció és schedule A/B EEPROM slotok readback ellenőrzéssel.
- Legfeljebb 60 schedule rekord, tranzakciós begin/chunk/commit/cancel folyamat.
- `offset` lapozás és legacy `index` kompatibilitás.
- OTA prepare ablak és `arduinoOTA` feltöltés 120 másodperces flash timeouttal.
- Védett `POST /api/v1/system/reboot`, valódi `HTTP 202 Accepted`, 750 ms késleltetéssel.
- Végleges hardverkapu: 60 rekord megmaradt OTA és reboot után; HTTP timeout és write failure 0.

### Repository

- Elavult Alpha/F14 patch-dokumentumok és package manifestek eltávolítása.
- Fő README, firmware dokumentáció, V5 állapot és release checklist újraírása.
- Történeti bizonyítékok összevonása egy rövid history dokumentumba.
- Beta workflow firmware-elvárás frissítése `4.3.0-beta.4` verzióra.

## 5.0.0-beta.4 / firmware 4.3.0-beta.4

- Külön alkalmazás- és firmware-frissítési csatorna.
- Szigorú Stable/Beta firmware release-kapu stabil fallback nélkül.
- Központi `release-versions.json` és gépi `firmware-release.json`.
- macOS Keychain munkamenet-cache, amely egy futás alatt összevonja a credential-olvasásokat.
- Firmware-katalógus Frissítés / Visszaállítás / Újratelepítés műveletekkel.


## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.
