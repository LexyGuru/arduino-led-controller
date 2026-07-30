# V5 implementációs állapot – 2026-07-30

## Dokumentum célja

Ez a dokumentum a teljes V5 roadmap és a rövid állapot-checklist közötti
részletes, bizonyítékokra épülő pillanatkép. Nem helyettesíti a master roadmapet,
hanem megmutatja, mely részek készültek el ténylegesen, melyek részlegesek, és
melyekhez kell még hardveres, platform- vagy produkciós elfogadás.

## Referenciák

- stabil produkciós ág: `main`;
- integrációs ág: `next/v5-rearchitecture`;
- aktuális munkacsomag: `feature/v5-server-modularization`;
- Alpha.2 célverzió: `5.0.0-alpha.2`;
- minősített runtime candidate:
  `1236becc37e9b4d8ed2334f3cd60b455c248e82d`;
- minősítéskori produkciós baseline:
  `58e01b40e4568f5cd2648d370614077ef08aa1ba`;
- produkciós Arduino: `10.0.0.123:80`;
- izolált staging HTTP: `127.0.0.1:3100`;
- izolált staging Arduino-cél: `127.0.0.1:65535`.


## Integrációs Pull Request állapota

- integrációs ág: `integration/v5-alpha2-server-modularization`;
- Pull Request: `#1`;
- célág: `next/v5-rearchitecture`;
- módosított fájlok: 432;
- GitHub API és helyi Git fájllista: egyezik;
- PR merge: még nem történt meg;
- aktuális blokkoló gate: négy fájl végén maradt fölösleges üres sor, továbbá
  a generátort úgy kell javítani, hogy ezt újrageneráláskor se hozza vissza;
- `main`, produkciós LXC és `10.0.0.123:80` Arduino: változatlan.

## Bizonyítékszintek

| Jelölés | Jelentés |
|---|---|
| Kész – automatizált | Repository-teszt vagy determinisztikus ellenőrzés bizonyítja. |
| Kész – LXC-ben igazolt | Valódi LXC környezetben gate, staging vagy rollback bizonyítja. |
| Részleges | Az alapimplementáció elkészült, de további cutover, platform- vagy hardverteszt szükséges. |
| Nyitott | A roadmapben szerepel, de még nincs teljes implementációs bizonyíték. |
| Tilos / korai | A szükséges előfeltételek még nem teljesültek. |

## Repository és release-alapok

| Tétel | Állapot | Bizonyíték / hátralévő feladat |
|---|---|---|
| Egységes verzióforrások | Kész – automatizált | `VERSION`, npm, Tauri, Cargo és OpenAPI `5.0.0-alpha.2` értékre szinkronizálva. |
| Kötelező lockfile-ok | Kész – automatizált | Gyökér npm, desktop npm és Cargo lockfile ellenőrzött. |
| Repository-validátor | Kész – automatizált | Szintaxis, kötelező fájlok, teljes tesztcsomag és titokellenőrzés. |
| Secret scanner | Kész – automatizált | Redaktált diagnosztika, dokumentációs env-helyőrzők és célzott allowlist. |
| SBOM és provenance | Kész – automatizált | CycloneDX és determinisztikus provenance tesztek. |
| Release evidence | Kész – automatizált és LXC-ben igazolt | Gate report, bundle, SHA-256, artifact index és execution archive. |

## Node.js/LXC gateway

| Tétel | Állapot | Bizonyíték / hátralévő feladat |
|---|---|---|
| Moduláris core és runtime context | Kész – automatizált | Közös konfiguráció, logger, lifecycle és shutdown. |
| API v2 | Kész – automatizált | OpenAPI 3.1, egységes response/error, legalább 100 generált művelet. |
| Auth és jogosultság | Kész – automatizált | Bearer, session, CSRF, admin/operator/viewer, tokenrotáció. |
| Audit, metrics, events | Kész – automatizált | Tartós audit, Prometheus, EventStore és Socket.IO gateway. |
| LED és Arduino szolgáltatás | Kész – automatizált | Soros Arduino kliens, LED service, státuszmonitor és legacy adapter. |
| Schedule szolgáltatás | Kész – automatizált | Atomikus repository, runner, import/export, konfliktus- és duplikációvédelem. |
| Firmware/OTA | Kész – automatizált | Release ellenőrzés, SHA-256, cancel, backup és rollback. |
| Legacy szerver fizikai eltávolítása | Részleges | Funkcionális cutover kész, de `server2_legacy.js` még kompatibilitási réteg. |
| Inline legacy dashboard teljes kiváltása | Részleges | Statikus installer elkészült, minden inline rész még nincs fizikailag eltávolítva. |
| Multer támogatott főverzió | Nyitott | Az Alpha.2 gate még Multer 1.x deprecation figyelmeztetést mutatott. |

## Staging, rollback és produkcióvédelem

| Tétel | Állapot | Bizonyíték / hátralévő feladat |
|---|---|---|
| Candidate izolált worktree gate | Kész – LXC-ben igazolt | Exact commit, teljes repository-validáció és endpointteszt. |
| Staging service | Kész – LXC-ben igazolt | Külön service, data/config/firmware könyvtár és loopback-only bind. |
| Produkciós Arduino izoláció | Kész – LXC-ben igazolt | Staging cél `127.0.0.1:65535`, nem a `10.0.0.123:80` eszköz. |
| Health-alapú telepítés | Kész – LXC-ben igazolt | `/health/live` és `/health/ready` HTTP 200. |
| Rollback rehearsal | Kész – LXC-ben igazolt | Szándékos health-hibánál a current symlink visszaállt. |
| Production guard | Kész – LXC-ben igazolt | `main` ág, commit, working-tree hash, service és health változatlan. |
| Execution receipt-lánc | Kész – LXC-ben igazolt | Staging, rollback és promotion receipt SHA-256 előzménylánccal. |
| Produkciós V5 telepítés | Tilos / korai | Nem része az Alpha.2 feature-finalizálásnak. |

## Desktop/Tauri

| Tétel | Állapot | Bizonyíték / hátralévő feladat |
|---|---|---|
| OpenAPI TypeScript kliens | Kész – automatizált | Determinisztikus types/operations/client generálás. |
| Credential bridge | Kész – automatizált | Keyring + zeroize, natív parancsok és memóriás fallback. |
| Kapcsolati állapotgép | Kész – automatizált | Online/offline/reconnecting, polling fallback és read cache. |
| System/release UI | Kész – automatizált | Preflight, maintenance, snapshot, migráció, release-gate és finalization panelek. |
| Dashboard/LED UI | Kész – automatizált | API v2, realtime, bulk műveletek és biztonságos fallback. |
| Schedule/firmware/log UI | Kész – automatizált | Konfliktuskezelés, backup/rollback/cancel és naplókezelés. |
| Minden képernyő teljes API v2 cutoverje | Részleges | A fő oldalak elkészültek; platformonkénti teljes regresszió még szükséges. |
| Windows/macOS/Linux kiadási teszt | Nyitott | Külön CI és valódi platformteszt kell. |

## Firmware és hardver

| Tétel | Állapot | Bizonyíték / hátralévő feladat |
|---|---|---|
| Jelenlegi firmware kompatibilitás | Részleges | LED, schedule, OTA és védett API működő alap. |
| Arduino schedule upload hardverteszt | Nyitott | Valódi UNO R4 WiFi + EEPROM teszt szükséges. |
| API-kulcs URL-ből fejlécbe | Részleges – automatizált | Node, legacy, macOS curl, Tauri és firmware kód elkészült; valódi UNO R4 WiFi, staging és fallback-off teszt még szükséges. |
| EEPROM A/B bankok | Nyitott | A master roadmap célja, még nincs teljes bizonyíték. |
| DST/időzóna/NTP kiesés | Nyitott | Valódi időváltási és hibatesztek szükségesek. |
| Watchdog/reset ok/boot számláló | Nyitott | Firmware-hardening munkacsomag. |
| 3 × 300 LED terhelési teszt | Nyitott | Valódi táp-, memória- és időzítési mérés szükséges. |

## Mobil Android/iOS

A mobil rész jelenleg nem tekinthető késznek. Nyitott többek között:

- QR- vagy mDNS/Bonjour párosítás;
- manuális IP fallback;
- Wi-Fi/mobilnet váltás;
- iOS helyi hálózati jogosultság;
- Android Network Security Config;
- háttér/előttér életciklus;
- aláírt Android AAB és iOS builddokumentáció;
- mobil OTA tiltás és valódi eszköztesztek.

## Dokumentációs állapot

- `fejlesztes_readme.md`: master roadmap és aktuális összkép;
- `V5_REARCHITECTURE_CHECKLIST.md`: napi, bizonyítékokra épülő rövid státusz;
- `V5_IMPLEMENTATION_STATUS.md`: részletes implementációs pillanatkép;
- `NEXT_V5_INTEGRATION_RUNBOOK.md`: feature → `next` integráció;
- `ALPHA2_RELEASE_NOTES.md`: Alpha.2 tartalom és korlátozások;
- `ALPHA2_MIGRATION.md`: staging és későbbi migrációs szabályok;
- `ALPHA2_VERSION_FINALIZATION.md`: a minősített candidate utáni megengedett változások.

## Alpha.2 integráció lezárása

- Pull Request: `#1`;
- célág: `next/v5-rearchitecture`;
- merge commit: `bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b`;
- repository-validáció: sikeres;
- working tree: tiszta;
- produkciós `main`: változatlan `58e01b40e4568f5cd2648d370614077ef08aa1ba`.

## Alpha.3 aktuális állapot

Az `X-Device-Key` runtime implementáció elkészült a forrásfán, de még nem
tekinthető hardveresen minősített release candidate-nek. Az alkalmazásverzió
szándékosan `5.0.0-alpha.2` marad az új gate és finalization befejezéséig.
A firmware célverzió `4.1.21`, a query fallback kezdetben engedélyezett.

## Következő biztonságos sorrend

1. `feature/v5-alpha3-device-key-header` ág létrehozása a `bd5cb67` `next` commitból;
2. az Alpha.3 csomag teljes repository-validációja, commitja és push-a;
3. GitHub Actions firmware `4.1.21` fordítás és artifact SHA-256 ellenőrzés;
4. firmware-first UNO R4 WiFi fejléc-, negatív és query-fallback hardverteszt;
5. staging gateway és Tauri fejléc-hitelesítés, valamint napló-redakció igazolása;
6. külön fallback-off firmware build, rollback-próba és új evidence-lánc;
7. csak sikeres gate és finalization után `5.0.0-alpha.3`; a `main` továbbra is külön release-kapu.

## Kifejezetten tiltott következő lépések

- közvetlen merge a `main` ágba;
- a produkciós LXC átváltása feature vagy `next` ágra;
- a produkciós Arduino titkainak átmásolása stagingbe;
- produkciós V5 telepítés új integrációs és hardvertesztek nélkül;
- Alpha.2 minősített runtime candidate-be utólag új runtime funkció keverése.
