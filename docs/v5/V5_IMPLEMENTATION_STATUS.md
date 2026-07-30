# V5 implementációs állapot – 2026-07-30

## Dokumentum célja

Ez a dokumentum a teljes V5 roadmap és a rövid állapot-checklist közötti
részletes, bizonyítékokra épülő pillanatkép. Nem helyettesíti a master roadmapet,
hanem megmutatja, mely részek készültek el ténylegesen, melyek részlegesek, és
melyekhez kell még hardveres, platform- vagy produkciós elfogadás.

## Referenciák

- stabil produkciós ág: `main`;
- integrációs ág: `next/v5-rearchitecture`;
- aktuális ág: `next/v5-rearchitecture`;
- aktuális alkalmazásverzió: `5.0.0-alpha.3`;
- Alpha.3 feature commit:
  `e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`;
- Alpha.3 integrációs merge:
  `295713798b1487ec2c788b170be2fce32fccea2a`;
- minősítéskori produkciós baseline:
  `58e01b40e4568f5cd2648d370614077ef08aa1ba`;
- produkciós Arduino: `10.0.0.123:80`;
- izolált staging HTTP: `127.0.0.1:3100`;
- izolált staging Arduino-cél: `127.0.0.1:65535`.


## Integrációs állapot

- Alpha.2 Pull Request `#1` merge commit:
  `bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b`;
- Alpha.3 feature végső commit:
  `e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`;
- Alpha.3 `--no-ff` merge commit a `next/v5-rearchitecture` ágon:
  `295713798b1487ec2c788b170be2fce32fccea2a`;
- firmware workflow run: `30536184636`, eredmény: `success`;
- alkalmazásverzió: `5.0.0-alpha.3`;
- firmware-verzió: `4.1.21`;
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
| Egységes verzióforrások | Kész – automatizált | `VERSION`, npm, Tauri, Cargo és OpenAPI `5.0.0-alpha.3` értékre szinkronizálva. |
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
| API-kulcs URL-ből fejlécbe | Kész – hardveren igazolt | Node, legacy, macOS curl, Tauri és firmware `X-Device-Key` migráció; teljes auth-mátrix, Node/Tauri staging, fallback-off és rollback sikeres. |
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

Az `X-Device-Key` runtime implementáció, a firmware `4.1.21`, a 30 másodperces
kliensablak, a hardveres auth-mátrix, a moduláris Node és Tauri/Rust staging,
a fallback-off próba, valamint a rollback bizonyítása elkészült. A feature ág
a `295713798b1487ec2c788b170be2fce32fccea2a` merge commitban bekerült a
`next/v5-rearchitecture` ágba, az alkalmazásverzió `5.0.0-alpha.3`.

A query fallback átmenetileg engedélyezett a kompatibilitási időszakra. Minden
új kliens a `X-Device-Key` fejlécet használja.

## Következő biztonságos sorrend

1. teljes Tauri/Node/Arduino alkalmazási staging a tartalék eszközön;
2. LED- és schedule-műveletek, offline/reconnect, restart és hibáskulcs-próba;
3. artifact-only Tauri desktop CI futtatása és artifact-ellenőrzése;
4. `next` LXC staging és rollback rehearsal produkciós branchváltás nélkül;
5. Alpha.2 történeti snapshot-tesztek verziófüggetlenítése, majd teljes tesztcsomag;
6. query fallback kivezetési terv és Beta.1 readiness;
7. csak külön release-kapuk után `main` merge vagy produkciós telepítés.

## Kifejezetten tiltott következő lépések

- közvetlen merge a `main` ágba;
- a produkciós LXC átváltása feature vagy `next` ágra;
- a produkciós Arduino titkainak átmásolása stagingbe;
- a jelenlegi Tauri release workflow kézi futtatása `next` ágról, amíg nincs
  külön artifact-only mód;
- produkciós V5 telepítés teljes alkalmazási, LXC- és platformtesztek nélkül.
