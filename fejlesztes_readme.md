# Arduino LED Controller – v5 teljes újratervezési menetrend

**Létrehozva:** 2026-07-28<br>
**Stabil produkciós ág:** `main`<br>
**Újratervezési integrációs ág:** `next/v5-rearchitecture`<br>
**Tervezett új főverzió:** `5.0.0`

---

## 0. Aktuális megvalósítási állapot

**Státusz frissítve:** 2026-07-30<br>
**Aktuális mérföldkő:** Alpha.3 integráció és verziófinalizálás<br>
**Integrációs ág:** `next/v5-rearchitecture`<br>
**Alpha.3 integrációs merge:**
`295713798b1487ec2c788b170be2fce32fccea2a`<br>
**Alpha.3 feature commit:**
`e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`<br>
**Alkalmazásverzió:** `5.0.0-alpha.3`<br>
**Firmware-verzió:** `4.1.21`<br>
**Változatlan produkciós baseline:**
`58e01b40e4568f5cd2648d370614077ef08aa1ba`

> Ez a fájl a teljes V5 master roadmap. A napi, bizonyítékokra épülő
> állapotkövetés elsődleges forrása a
> `docs/v5/V5_REARCHITECTURE_CHECKLIST.md`; a részletes pillanatkép a
> `docs/v5/V5_IMPLEMENTATION_STATUS.md`; az Alpha.2 és Alpha.3 integrációs
> előzmény pedig a `docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md` dokumentumban van.

### Jelenlegi összkép

| Terület | Állapot | Megjegyzés |
|---|---|---|
| Produkciós `main` és Arduino | Védett, változatlan | A produkciós LXC továbbra is a `main` ágat követi; a valódi Arduino címe `10.0.0.123:80`. |
| Repository-alapok és validáció | Kész az Alpha.3 szintjén | Verzióforrások, lockfile-ok, repository-validátor, titokellenőrzés és package manifestek működnek. |
| Moduláris Node/LXC gateway | Alpha.2 integráció kész | API v2, auth, audit, metrics, schedule, firmware, release-gate, staging és rollback automatizált tesztekkel rendelkezik. |
| Alpha.3 eszközhitelesítés | Kész és hardveren igazolt | `X-Device-Key`, 30 másodperces kliensablak, Node/Tauri staging, fallback-off és rollback kapu teljesült. |
| `next` integráció | Alpha.3 beolvasztva | A `2957137` merge commit a hardveresen validált feature történetét `--no-ff` merge-ben tartalmazza. |
| Desktop/Tauri API v2 átállás | Nagyrészt kész | A fő képernyők domain adaptereket használnak; teljes alkalmazási és platformteszt még szükséges. |
| Firmware újratervezés | Részleges | A header auth stabil; az EEPROM A/B, teljes időzóna/DST, watchdog, schedule upload és 3 × 300 LED terhelési teszt még nyitott. |
| Mobil Android/iOS | Nyitott | Párosítás, mobil életciklus, jogosultságok, build és valódi eszközteszt külön munkacsomag. |
| `main` merge és produkciós V5 telepítés | Tilos / korai | Csak teljes Alpha staging, Beta/RC, platform-, LXC-, migrációs és security elfogadás után. |

### Bizonyított Alpha.3 eredmények

- [x] firmware `4.1.21` header-first `X-Device-Key` hitelesítés;
- [x] teljes hardveres auth-mátrix: `200, 401, 401, 200, 401, 400, 200`;
- [x] moduláris Node staging, minimum 30000 ms request/health timeout;
- [x] Tauri/Rust staging, 5000 ms connect és 30000 ms response timeout;
- [x] fallback-off firmware build és hardverteszt;
- [x] automatikus fallback-on rollback és utóellenőrzés;
- [x] titokmentes evidence és dokumentáció;
- [x] feature merge a `next/v5-rearchitecture` ágba;
- [x] merge commit firmware workflow: `30536184636`, `success`;
- [x] `5.0.0-alpha.3` verziófinalizálás.

### Következő mérföldkövek

1. teljes Alpha.3 alkalmazási staging a tartalék Arduino ellen;
2. LED-, schedule-, offline-, reconnect- és hibáskulcs-szcenáriók végponttól végpontig;
3. artifact-only Tauri desktop CI sikeres macOS, Windows és Linux artifact builddel;
4. LXC `next` staging, health, restart és rollback próba produkciós branchváltás nélkül;
5. Alpha.2 történeti snapshot-tesztek verziófüggetlenítése és teljes `npm test`;
6. query fallback kivezetési döntés, várhatóan Beta.1 előtt vagy Beta.1-ben;
7. funkciózár és `5.0.0-beta.1` readiness gate.

---

## 1. Cél

Az Arduino firmware, a Node.js/LXC átjáró, a Tauri desktop kliens, valamint az Android és iOS alkalmazások egységes, biztonságos és hosszú távon karbantartható újratervezése.

A jelenlegi `main` ág változatlanul a működő produkciós rendszer marad. Az új rendszer külön ágon készül, ezért bármikor vissza lehet térni a jelenlegi állapothoz.

### Alapelvek

1. A produkciós LXC kizárólag a `main` ágat kövesse.
2. Új fejlesztés ne kerüljön közvetlenül a `main` ágra.
3. Az Arduino LXC és alkalmazás nélkül is hajtsa végre az időzítéseket.
4. Távoli eléréshez az LXC legyen a HTTPS-átjáró.
5. Az Arduino OTA-portja ne legyen közvetlenül internetre nyitva.
6. Titkok ne kerüljenek GitHubra, URL-be vagy frontend-válaszba.
7. Minden nagy komponenshez legyen automatikus teszt és rollback.
8. Az API v2 átmenetileg maradjon kompatibilis a jelenlegi rendszerrel.
9. Az új rendszer csak teljes hardveres és alkalmazásteszt után kerülhet a `main` ágba.

---

## 2. Branch-stratégia

### Állandó ágak

| Ág | Feladat |
|---|---|
| `main` | Jelenlegi stabil produkciós rendszer |
| `next/v5-rearchitecture` | Az új v5 rendszer közös integrációs ága |
| `release/v5.0.0` | Kiadás előtti befagyasztott ág |
| `hotfix/...` | A jelenlegi `main` sürgős javításai |

### Fejlesztési ágak

```text
feature/v5-repository-foundation
feature/v5-api-contract
feature/v5-firmware-core
feature/v5-firmware-storage
feature/v5-firmware-network
feature/v5-gateway-server
feature/v5-lxc-deployment
feature/v5-tauri-backend
feature/v5-react-ui
feature/v5-mobile
feature/v5-security
feature/v5-ci-release
feature/v5-documentation
```

Minden `feature/v5-*` ág a `next/v5-rearchitecture` ágból induljon, és Pull Requesttel oda kerüljön vissza.

### Tiltott műveletek

- közvetlen fejlesztés a `main` ágon;
- produkciós LXC átváltása a `next/v5-rearchitecture` ágra;
- fejlesztés a produkciós LXC munkakönyvtárában;
- kézi, rootként futtatott `npm install` a produkciós LXC-ben;
- GitHubon tárolt valós `secrets.h`, API-kulcs vagy OTA-jelszó;
- fejlesztői branchből stabil release publikálása.

---

## 3. Biztonsági alapállapot és branch létrehozása

Az új branch létrehozását a Macen vagy külön fejlesztői gépen végezd.

```bash
cd /A/SAJAT/REPOSITORY/HELYE

git status
git switch main
git pull --ff-only origin main
git status --short
```

A `git status --short` ne írjon ki nem mentett változtatást.

### Stabil állapot megjelölése

```bash
git tag -a baseline-before-v5-2026-07-28 \
  -m "Stabil main állapot a teljes v5 újratervezés előtt"

git push origin baseline-before-v5-2026-07-28
```

### Új integrációs ág

```bash
git switch -c next/v5-rearchitecture
git push -u origin next/v5-rearchitecture
```

### Menetrend commitolása

```bash
git add fejlesztes_readme.md
git commit -m "docs: add v5 rearchitecture roadmap"
git push
```

---

## 4. Produkciós LXC védelme

A produkciós konténer maradjon a `main` ágon:

```bash
cd /opt/arduino-led-controller

git -c safe.directory=/opt/arduino-led-controller branch --show-current
```

Várt eredmény:

```text
main
```

A frissítés kizárólag:

```bash
bash deploy/update.sh
```

Javítás:

```bash
bash deploy/update.sh --repair
```

Ne futtasd produkcióban:

```bash
npm install
git switch next/v5-rearchitecture
git reset --hard
git clean -fd
```

### Ajánlott külön staging LXC

```text
arduino-led-controller-prod     → main
arduino-led-controller-staging  → next/v5-rearchitecture
```

A staging környezethez legyen külön:

- hostname és HTTPS-cím;
- adatkönyvtár;
- session secret;
- napló;
- lehetőség szerint teszt Arduino;
- systemd szolgáltatásnév.

---

# 5. Fejlesztési fázisok

## FÁZIS 0 – Baseline és visszaállíthatóság

### Feladatok

- [ ] `baseline-before-v5-2026-07-28` tag.
- [ ] `next/v5-rearchitecture` branch.
- [ ] Produkciós LXC konfiguráció mentése.
- [ ] Jelenlegi schedule export.
- [ ] `secrets.h` biztonságos, GitHubon kívüli mentése.
- [ ] Firmware-bináris és SHA-256 mentése.
- [ ] Desktop és mobil kiadási fájlok mentése.
- [ ] Jelenlegi API-végpontok dokumentálása.
- [ ] EEPROM-címek és adatformátumok dokumentálása.
- [ ] Hardver lábkiosztás dokumentálása.
- [ ] Ismert hibák és működő funkciók listája.
- [ ] `docs/baseline/BASELINE_2026-07-28.md`.

### Tisztázandó jelenlegi eltérések

- firmware fejléc, tényleges verzió és release notes egyezése;
- EEPROM-időzítés és a firmware fejlécének leírása;
- README és forráskód portjainak egyezése;
- gyökér Node-csomag és szerververzió;
- régi SD-kártyás schedule-részek;
- régi és új API-elnevezések;
- Tauri, Cargo és Tauri config verziók;
- OTA-port tényleges értéke.

### Elfogadási feltétel

A jelenlegi rendszer a tagből, a mentett konfigurációból és firmware-ből újratelepíthető.

---

## FÁZIS 1 – Repository-alapok

### Javasolt struktúra

```text
arduino-led-controller/
├── .github/
├── deploy/
│   ├── lxc/
│   ├── systemd/
│   ├── caddy/
│   └── scripts/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── baseline/
│   ├── deployment/
│   ├── migration/
│   ├── security/
│   └── testing/
├── firmware/ArduinoLedController/
│   ├── ArduinoLedController.ino
│   ├── include/
│   ├── src/
│   ├── test/
│   ├── secrets.example.h
│   └── version.h
├── server/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── package-lock.json
├── desktop-tauri/
├── packages/api-contract/
├── scripts/
├── VERSION
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── fejlesztes_readme.md
└── README.md
```

A gyökér `server2_final.js` átmenetileg kompatibilitási indítófájl lehet:

```javascript
require("./server/src/index.js");
```

### Feladatok

- [ ] `.editorconfig`.
- [ ] formázási és lintszabályok.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md`.
- [ ] Pull Request és Issue sablonok.
- [ ] egyetlen `VERSION` fájl.
- [ ] automatikus verzióellenőrző script.
- [ ] kötelező lock fájlok.
- [ ] elavult dokumentumok `docs/archive/` alá.
- [ ] `scripts/validate-repository.sh`.

### Commit-elnevezések

```text
feat:
fix:
refactor:
security:
test:
docs:
build:
ci:
chore:
```

### Elfogadási feltétel

```bash
bash scripts/validate-repository.sh
```

egyetlen parancsban ellenőrzi a struktúrát, verziókat, lock fájlokat és tiltott titkokat.

---

## FÁZIS 2 – Egységes API v2

### Alapútvonal

```text
/api/v2
```

### Javasolt végpontok

```text
GET    /api/v2/device
GET    /api/v2/device/health
GET    /api/v2/device/capabilities

GET    /api/v2/strips
PATCH  /api/v2/strips/:id
POST   /api/v2/strips/all-on
POST   /api/v2/strips/all-off

GET    /api/v2/schedules
PUT    /api/v2/schedules
DELETE /api/v2/schedules
POST   /api/v2/schedules/validate

GET    /api/v2/logs
DELETE /api/v2/logs

GET    /api/v2/time
POST   /api/v2/time/sync

GET    /api/v2/ota/status
POST   /api/v2/ota/prepare
POST   /api/v2/ota/upload
```

### Egységes sikeres válasz

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "apiVersion": "2",
    "deviceId": "arduino-led-controller",
    "firmwareVersion": "5.0.0"
  }
}
```

### Egységes hibaválasz

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Érvénytelen kérés.",
    "details": {}
  }
}
```

### Hitelesítés

Az API-kulcs ne URL-paraméter legyen:

```http
X-Device-Key: <titkos kulcs>
```

Később, hardveres mérés után bevezethető timestamp, nonce és HMAC-aláírás.

### Közös szerződés

```text
packages/api-contract/
├── openapi.yaml
├── schemas/
├── examples/
└── README.md
```

### Kompatibilitás

- [ ] v1 adapter;
- [ ] API-verzió felismerése;
- [ ] kliens automatikusan választ v1/v2 között;
- [ ] elavulási figyelmeztetés;
- [ ] v1 törlési feltételek dokumentálása.

---

## FÁZIS 3 – Arduino firmware

### Modulok

```text
AppController
ApiAuthentication
ConfigStore
Diagnostics
HttpApi
LedEngine
NetworkManager
OtaService
PirController
ScheduleEngine
ScheduleStore
TimeService
WatchdogService
```

Az `.ino` csak:

```cpp
void setup() {
  app.begin();
}

void loop() {
  app.tick();
}
```

### Állapotgép

```text
BOOTING
CONFIG_REQUIRED
WIFI_CONNECTING
TIME_SYNCING
READY
DEGRADED
OTA_PREPARING
OTA_UPDATING
ERROR
```

### EEPROM A/B bankok

Külön kétbankos tárolás:

```text
Config A / Config B
Schedule A / Schedule B
```

Minden bank:

- magic;
- séma verzió;
- generáció;
- adathossz;
- checksum;
- committed jelző.

### Időkezelés

- [ ] NTP külön modulban.
- [ ] Utolsó sikeres szinkron.
- [ ] időzóna konfiguráció.
- [ ] téli/nyári átállás teszt.
- [ ] vasárnap–hétfő teszt.
- [ ] NTP-kiesés kezelése.
- [ ] hibás időnél schedule biztonságos letiltása.

### LED-motor

- [ ] sávonkénti fényerőkorlát;
- [ ] globális teljesítménykeret;
- [ ] konfigurálható pixelszám;
- [ ] gamma-korrekció;
- [ ] nem blokkoló effektek;
- [ ] OTA alatti alacsony terhelés;
- [ ] `millis()` túlcsordulás kezelése.

### Hálózat és API

- [ ] fokozatos Wi-Fi retry;
- [ ] request/response méretkorlát;
- [ ] rövid timeoutok;
- [ ] API-kulcs fejlécben;
- [ ] titkok naplózásának tiltása;
- [ ] több kliens kontrollált kezelése;
- [ ] mDNS/Bonjour értékelése.

### OTA és watchdog

- [ ] OTA csak helyi hálózaton vagy gatewayen keresztül;
- [ ] downgrade-védelem;
- [ ] frissítési hibaszámláló;
- [ ] utolsó OTA eredmény;
- [ ] hardveres watchdog;
- [ ] reset ok;
- [ ] boot számláló;
- [ ] diagnosztikai API.

### Kötelező tesztek

- [ ] üres és sérült EEPROM;
- [ ] félbeszakadt mentés;
- [ ] 60 schedule;
- [ ] időváltás;
- [ ] Wi-Fi és NTP kiesés;
- [ ] OTA megszakítás;
- [ ] áramtalanítás mentés közben;
- [ ] 3 × 300 LED;
- [ ] több egyidejű kliens.

### Elfogadási feltétel

Az Arduino önállóan működik, megtartja a konfigurációt, végrehajtja az időzítéseket és biztonságosan frissíthető.

---

## FÁZIS 4 – Node.js/LXC gateway

### Javasolt szerkezet

```text
server/src/
├── app.js
├── index.js
├── config/
├── auth/
├── arduino/
├── schedules/
├── database/
├── routes/
├── websocket/
└── logging/
```

### Függőségek

- [ ] `package-lock.json` kötelező;
- [ ] produkcióban `npm ci --omit=dev`;
- [ ] Multer támogatott főverzió;
- [ ] Node-verzió rögzítése;
- [ ] dependency audit;
- [ ] root és server package-szerepek tisztázása.

### Biztonság

- [ ] WebSocket session-hitelesítés;
- [ ] CSP;
- [ ] szűk CORS;
- [ ] Origin és `Sec-Fetch-Site`;
- [ ] valódi CSRF-védelem;
- [ ] secure cookie;
- [ ] rate limit;
- [ ] biztonságos fájlfeltöltés;
- [ ] fájlnév-validáció az eredeti néven;
- [ ] ideiglenes fájlok törlése;
- [ ] auditnapló;
- [ ] admin/operator/viewer szerepkörök.

### Arduino-kéréssor

- prioritás;
- timeout;
- retry;
- utolsó írás nyer;
- kérésösszevonás;
- OTA alatti tiltások;
- circuit breaker;
- egészségállapot.

### SQLite

Táblák:

```text
users
sessions
settings
devices
schedules
schedule_versions
audit_log
ota_history
health_history
```

### Health végpontok

```text
GET /health/live
GET /health/ready
GET /health/arduino
```

### Atomi LXC-frissítés

```text
/opt/arduino-led-controller/
├── releases/<commit>/
├── current -> releases/<commit>
└── shared/
```

Folyamat:

1. fetch;
2. külön release könyvtár;
3. `npm ci`;
4. tesztek;
5. symlink váltás;
6. restart;
7. health check;
8. hiba esetén rollback.

### Jogosultságok

```text
forrás/release      root:root vagy read-only
node_modules        arduino-led:arduino-led
adatok/npm-cache    arduino-led:arduino-led
.env                root:arduino-led 0640
```

A `--repair` automatikusan ismerje fel és javítsa a root tulajdonú `node_modules` hibát.

### Elfogadási feltétel

Hibás frissítés után automatikus rollback történik, a működő kiadás elérhető marad.

---

## FÁZIS 5 – Tauri Rust backend

### Modulok

```text
state
error
platform
config/profiles
config/secure_store
arduino/direct
arduino/gateway
arduino/protocol
arduino/queue
arduino/schedules
ota/github
ota/verifier
ota/uploader
commands
```

### Kapcsolati módok

```text
Direct: Tauri → Arduino
Gateway: Tauri → HTTPS LXC → Arduino
```

Távoli elérésnél a gateway mód legyen az alapértelmezett.

### Secure storage

- macOS/iOS Keychain;
- Windows Credential Manager;
- Android Keystore;
- Linux Secret Service vagy dokumentált fallback.

A frontend csak konfiguráltsági jelzőt kapjon, a valódi titkot ne.

### Kéréssor és OTA

- [ ] rövid debounce;
- [ ] csúszka elengedésekor azonnali küldés;
- [ ] utolsó állapot nyer;
- [ ] megszakítható kérés;
- [ ] OTA alatt vezérlés blokkolása;
- [ ] desktop OTA;
- [ ] mobil OTA backendből is tiltva;
- [ ] SHA-256 és később digitális aláírás;
- [ ] downgrade-védelem.

### Elfogadási feltétel

Ugyanaz a frontend direct és gateway kapcsolattal is működik, a titkok nem kerülnek a frontendbe.

---

## FÁZIS 6 – React UI

### Oldalak

```text
Áttekintés
LED-sávok
Időzítések
Automatizálás
Naplók
Diagnosztika
Firmware
Eszközök
Beállítások
```

### Követelmények

- [ ] WebSocket, polling fallback;
- [ ] háttérben polling leáll;
- [ ] előtérben teljes frissítés;
- [ ] offline és utolsó ismert állapot;
- [ ] optimista UI visszaállítással;
- [ ] schedule ütközésjelzés;
- [ ] export/import;
- [ ] teljes diagnosztikai oldal;
- [ ] billentyűzet és képernyőolvasó;
- [ ] megfelelő kontraszt;
- [ ] minimum 44–48 px mobil érintési cél.

---

## FÁZIS 7 – Android és iOS

### Mobil navigáció

```text
Állapot | LED-ek | Időzítés | Napló | Beállítások
```

### Párosítás

1. LXC egyszer használható tokent készít.
2. QR-kód jelenik meg.
3. Mobil beolvassa.
4. HTTPS-en beváltja.
5. Külön mobil session készül.
6. Token lejár.
7. Session secure storage-ba kerül.

### Mobil feladatok

- [ ] mDNS/Bonjour vagy QR-párosítás;
- [ ] manuális IP fallback;
- [ ] Wi-Fi/mobilnet váltás;
- [ ] háttér/előttér életciklus;
- [ ] iOS helyi hálózati engedély;
- [ ] Android Network Security Config;
- [ ] iPhone/iPad safe area;
- [ ] aláírt Android AAB;
- [ ] iOS aláírási dokumentáció;
- [ ] mobil OTA tiltás;
- [ ] LXC-alapú értesítések.

### Értesítési események

- Arduino offline;
- időszinkron elveszett;
- schedule szinkronhiba;
- OTA elérhető vagy sikertelen;
- túl sok újraindulás;
- gyenge Wi-Fi;
- LXC szolgáltatáshiba.

---

## FÁZIS 8 – Biztonság

### Kötelező

- [ ] titkok URL-ből fejlécbe;
- [ ] titkok maszkolása;
- [ ] HTTPS;
- [ ] WebSocket auth;
- [ ] CSP/CORS/CSRF;
- [ ] session rotation;
- [ ] rate limit;
- [ ] szerepkörök;
- [ ] secure storage;
- [ ] firmware-integritás;
- [ ] release-integritás;
- [ ] `SECURITY.md`;
- [ ] `docs/security/THREAT_MODEL.md`.

### Threat model

Vizsgálandó:

- ellopott API-kulcs;
- replay;
- hamis Arduino vagy gateway;
- MITM;
- nyitott OTA;
- brute force;
- session lopás;
- CSRF;
- path traversal;
- rosszindulatú firmware;
- kompromittált dependency;
- ellopott telefon.

---

## FÁZIS 9 – CI és release

### `main`

- stabil ellenőrzések;
- stabil release csak tagből;
- produkciós LXC ezt követi.

### `next/v5-rearchitecture`

- minden teszt;
- snapshot artifact;
- külön prerelease;
- nem írhatja felül a stabil firmware vagy Tauri release-t.

### Firmware CI

- [ ] core és library verziók rögzítése;
- [ ] warningok;
- [ ] binárisméret;
- [ ] tesztek;
- [ ] SHA-256;
- [ ] build metadata;
- [ ] külön next/stable release.

### Node CI

- [ ] `npm ci`;
- [ ] lint;
- [ ] unit/integrációs/API teszt;
- [ ] shellcheck;
- [ ] Debian/LXC telepítési teszt;
- [ ] dependency audit.

### Tauri CI

- [ ] TypeScript;
- [ ] frontend tesztek;
- [ ] Rust fmt;
- [ ] Clippy;
- [ ] Rust tesztek;
- [ ] Windows/macOS/Linux;
- [ ] Android;
- [ ] iOS unsigned tesztbuild.

### Supply chain

- [ ] Actions commit SHA;
- [ ] minimális jogosultság;
- [ ] Dependabot;
- [ ] CodeQL;
- [ ] secret scanning;
- [ ] SBOM;
- [ ] artifact attestation;
- [ ] checksumok.

### Egységes verzió

Gyökér:

```text
VERSION
```

A release script frissítse a firmware, Node, frontend, Cargo és Tauri config verzióit. A CI álljon le eltérésnél.

---

## FÁZIS 10 – Migráció

### Firmware

- [ ] régi EEPROM séma felismerése;
- [ ] network/API/schedule import;
- [ ] checksum ellenőrzés;
- [ ] hiba esetén régi bank érintetlen;
- [ ] migrációs napló.

### LXC

- [ ] JSON → SQLite;
- [ ] schedule fájlok importja;
- [ ] `.env` leképezése;
- [ ] régi adatok read-only archiválása;
- [ ] visszaállítási script.

### Tauri

- [ ] régi `connection.json`;
- [ ] nem titkos mezők importja;
- [ ] titkok secure storage-ba;
- [ ] régi fájlból titkok eltávolítása;
- [ ] profil létrehozása.

### Kompatibilitási mátrix

| Firmware | LXC | Tauri | Állapot |
|---|---|---|---|
| 4.x | 1.x | 3.x | jelenlegi stabil |
| 4.x | 5.x | 3.x | átmeneti |
| 4.x | 5.x | 5.x | átmeneti |
| 5.x | 5.x | 3.x | v1 adapterrel |
| 5.x | 5.x | 5.x | célállapot |

---

## FÁZIS 11 – Teljes tesztmátrix

### Arduino

- [ ] hidegindítás;
- [ ] Wi-Fi/NTP kiesés;
- [ ] EEPROM sérülés;
- [ ] áramszünet mentéskor;
- [ ] 3 × 300 LED;
- [ ] maximális fényerő;
- [ ] PIR/gombok;
- [ ] több kliens;
- [ ] OTA siker/megszakítás;
- [ ] watchdog.

### LXC

- [ ] tiszta Debian telepítés;
- [ ] update és rollback;
- [ ] root `node_modules` javítása;
- [ ] hibás dependency és `.env`;
- [ ] Arduino offline;
- [ ] WebSocket auth;
- [ ] session és rate limit;
- [ ] feltöltés és security headerek.

### Desktop

- [ ] macOS/Windows/Linux;
- [ ] direct/gateway;
- [ ] offline;
- [ ] schedule;
- [ ] OTA;
- [ ] secure storage;
- [ ] több profil és több eszköz.

### Mobil

- [ ] Android telefon/tablet;
- [ ] iPhone/iPad;
- [ ] álló/fekvő nézet;
- [ ] helyi hálózati engedély;
- [ ] Wi-Fi/mobilnet váltás;
- [ ] háttér/előttér;
- [ ] QR-párosítás;
- [ ] mobil OTA tiltás.

### Biztonság

- [ ] hibás/hiányzó kulcs;
- [ ] URL-kulcs elutasítása;
- [ ] WebSocket session nélkül;
- [ ] más origin;
- [ ] CSRF;
- [ ] path traversal;
- [ ] túl nagy fájl/JSON;
- [ ] brute force;
- [ ] replay;
- [ ] hibás firmware checksum;
- [ ] downgrade.

---

## FÁZIS 12 – Release Candidate

```bash
git switch next/v5-rearchitecture
git pull --ff-only origin next/v5-rearchitecture
git switch -c release/v5.0.0
git push -u origin release/v5.0.0
```

Verzió:

```text
5.0.0-rc.1
```

Kötelező:

- [ ] automatikus tesztek;
- [ ] hardvertesztek;
- [ ] staging LXC;
- [ ] minden desktop build;
- [ ] Android és iOS build;
- [ ] migráció;
- [ ] rollback;
- [ ] security review;
- [ ] changelog és release notes.

A release ágra csak hibajavítás kerülhet.

---

## FÁZIS 13 – Beolvasztás a `main` ágba

Feltételek:

- minden kötelező teszt sikeres;
- firmware hardveren stabil;
- LXC rollback működik;
- mobilalkalmazások használhatók;
- migráció sikeres;
- nincs kritikus biztonsági hiba;
- dokumentáció elkészült.

Pull Request:

```text
release/v5.0.0 → main
```

Tag:

```bash
git switch main
git pull --ff-only origin main
git tag -a v5.0.0 -m "Arduino LED Controller 5.0.0"
git push origin v5.0.0
```

A produkciós LXC továbbra is `main` ágon marad.

---

# 6. Történeti első végrehajtandó munkacsomag

```bash
git switch next/v5-rearchitecture
git pull --ff-only origin next/v5-rearchitecture
git switch -c feature/v5-repository-foundation
```

### Tartalom

- [ ] roadmap és baseline;
- [ ] `VERSION`;
- [ ] verzióellenőrző script;
- [ ] `.editorconfig`;
- [ ] `CONTRIBUTING.md`;
- [ ] `SECURITY.md`;
- [ ] PR sablon;
- [ ] lock fájlok;
- [ ] LXC npm-jogosultsági javítás;
- [ ] health endpointok;
- [ ] `next` branch release-védelme.

Commit:

```bash
git add .
git commit -m "chore: establish v5 repository foundation"
git push -u origin feature/v5-repository-foundation
```

Pull Request:

```text
feature/v5-repository-foundation → next/v5-rearchitecture
```

---

# 7. Ajánlott végrehajtási sorrend

1. Baseline és branch-ek.
2. Repository-alapok.
3. LXC jogosultsági és frissítési hibák.
4. API v2 szerződés.
5. Firmware modulokra bontása.
6. EEPROM A/B tárolás.
7. Firmware API v2.
8. Node/LXC moduláris szerver.
9. SQLite és migráció.
10. WebSocket és webbiztonság.
11. Atomi deploy és rollback.
12. Tauri Rust modulok.
13. Secure storage.
14. Direct/gateway profilok.
15. React UI.
16. Mobil életciklus és párosítás.
17. Értesítések.
18. Teljes CI/release.
19. Migrációs próba.
20. Release Candidate.
21. `main` merge.

---

# 8. Definition of Done

Egy feladat csak akkor kész, ha:

1. lefordul;
2. lint és statikus ellenőrzés sikeres;
3. tesztek sikeresek;
4. hibaágak kezeltek;
5. napló nem tartalmaz titkot;
6. dokumentáció friss;
7. kompatibilitás dokumentált;
8. migráció és rollback megoldott;
9. külön Pull Requestben áttekinthető;
10. stagingben ellenőrzött;
11. hardverváltozás UNO R4 WiFi-n tesztelt;
12. mobilváltozás valódi telefonon tesztelt.

---

# 9. Végső célarchitektúra

```text
Desktop Tauri ─────┐
                   ├── direct helyi kapcsolat ───────┐
Mobil Tauri ───────┤                                  │
                   └── HTTPS LXC Gateway ────────────┤
                                                      ▼
                                             Arduino UNO R4 WiFi
                                             API v2
                                             EEPROM A/B
                                             önálló schedule
                                             helyi OTA
                                                      │
                                              LED1 / LED2 / LED3
```

---

# 10. Aktuális következő konkrét lépések

Az Alpha.3 feature integrációja és verziófinalizálása lezárult. A további munka
közvetlenül a `next/v5-rearchitecture` integrációs ágból induló, külön
feature ágakon folytatódik.

## 10.1 Teljes alkalmazási staging

Külön feature munkacsomagban készüljön reprodukálható staging gate, amely a
Tauri/desktop, Node gateway és a tartalék UNO R4 WiFi teljes láncát ellenőrzi:

- alkalmazásindítás és konfigurációs preflight;
- `/api/status` és `/api/console/stats`;
- LED olvasás, egyedi vezérlés, all-on/all-off és állapot-visszaolvasás;
- schedule listázás, létrehozás, módosítás, Arduino-szinkron és törlés;
- offline, reconnect, timeout és hibás kulcs;
- restart utáni helyreállás;
- titokmentes napló és evidence.

## 10.2 Biztonságos desktop CI

A `.github/workflows/tauri-artifact-build.yml` külön artifact-only CI-t ad a
`next` és V5 feature ágakhoz. macOS, Windows és Linux staging csomagokat
fordít és 14 napos workflow artifactként tárol, de nem hoz létre vagy módosít
public GitHub release-t.

## 10.3 LXC staging

Az Alpha.3 integrált `next` commit külön staging LXC-ben fusson át:

- dependency install;
- config preflight;
- loopback vagy tartalék-Arduino cél;
- health/readiness;
- restart;
- rollback rehearsal;
- production guard.

## 10.4 Beta.1 előtti stabilizáció

- történeti Alpha.2 snapshot-tesztek verziófüggetlenítése;
- teljes repository- és `npm test` regresszió;
- nyitott firmware schedule/EEPROM és terhelési kapuk;
- query fallback kivezetési terv;
- platformmátrix macOS, Windows és Linux;
- funkciózár, ismert hibák és Beta.1 release checklist.

A `main` ág, a produkciós LXC és a `10.0.0.123:80` Arduino a fenti lépések
alatt változatlan marad. Produkciós telepítés és public release csak külön,
explicit release-jóváhagyással történhet.
