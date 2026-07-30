# Arduino LED Controller – API v2 szerződés

**Állapot:** `5.0.0-alpha.1`
**API-verzió:** `2`
**Alapútvonal:** `/api/v2`

## 1. Cél és kompatibilitás

Az API v2 egységes HTTP-válaszformátumot ad a webes felület, a Tauri
alkalmazás és a későbbi külső kliensek számára.

A meglévő `/api/...` végpontok változatlanul működnek. Az API v2 első
változata olvasási és LED-vezérlési végpontokat tartalmaz. A jelenlegi
felületet, mobilalkalmazást és Arduino firmware-t nem töri el, mert a
legacy `/api/...` végpontok változatlanul megmaradnak.

## 2. Tartalomtípus és kódolás

Minden JSON-válasz:

```http
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Request-ID: <request-id>
```

A kliens opcionálisan küldhet saját request ID-t:

```http
X-Request-ID: desktop-request-0001
```

Az elfogadott request ID 8–128 karakteres, és betűt, számot, pontot,
aláhúzást, kettőspontot vagy kötőjelet tartalmazhat. Érvénytelen vagy hiányzó
érték esetén a szerver UUID-t generál.

## 3. Hitelesítés

A védett végpontok Bearer tokent használnak:

```http
Authorization: Bearer <API_V2_TOKEN>
```

A token a szerveren az alábbi környezeti változóban található:

```text
API_V2_TOKEN
```

Követelmények:

- legalább 32 karakter;
- véletlenszerű, nem alapértelmezett érték;
- kizárólag `/etc/arduino-led-controller.env` vagy más titkos
  konfiguráció tartalmazhatja;
- GitHubra nem kerülhet.

### Nyilvános végpontok

- `GET /api/v2`
- `GET /api/v2/system/health`

### Védett végpontok

- `GET /api/v2/system/status`
- `GET /api/v2/arduino/status`
- `GET /api/v2/leds`
- `GET /api/v2/leds/:id`
- `PUT /api/v2/leds/:id`
- `POST /api/v2/leds/actions/all-on`
- `POST /api/v2/leds/actions/all-off`
- `POST /api/v2/leds/actions/reset`

A token szerepkörét az `API_V2_ROLE` adja meg:

- `viewer`: rendszer-, Arduino- és LED-állapot olvasása;
- `operator`: olvasás és LED-vezérlés;
- `admin`: minden művelet, beleértve a LED resetet.

Hiányzó vagy hibás token esetén:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="arduino-led-controller-api-v2"
```

## 4. Sikeres válasz

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "desktop-request-0001",
    "timestamp": "2026-07-28T10:00:00.000Z",
    "apiVersion": "2",
    "durationMs": 3
  }
}
```

## 5. Hibaválasz

```json
{
  "success": false,
  "error": {
    "code": "ARDUINO_UNREACHABLE",
    "message": "Az Arduino jelenleg nem érhető el.",
    "details": null
  },
  "meta": {
    "requestId": "desktop-request-0001",
    "timestamp": "2026-07-28T10:00:00.000Z",
    "apiVersion": "2",
    "durationMs": 502
  }
}
```

A kliensek az `error.code` mező alapján kezeljék a hibát. A magyar
`error.message` felhasználói vagy naplózási szöveg, nem stabil programozási
azonosító.

## 6. Végpontok

### `GET /api/v2`

Nyilvános API-felderítő végpont. Visszaadja az API verzióját, stabilitási
szintjét, hitelesítési módját és az első elérhető végpontokat.

**Sikeres státusz:** `200`

### `GET /api/v2/system/health`

Nyilvános readiness ellenőrzés. Ellenőrzi:

- az API v2 Bearer token konfigurációját;
- az Arduino célcímet és portot;
- az Arduino privát útvonalát és kulcsát;
- a data, config, schedules és firmware könyvtárakat.

Ez a végpont nem próbál ténylegesen csatlakozni az Arduino eszközhöz.

**Kész állapot:** `200`, sikeres válasz
**Nem kész állapot:** `503`, `SYSTEM_NOT_READY`

### `GET /api/v2/system/status`

Védett szerverállapot. Visszaadja:

- a szolgáltatás és az API verzióját;
- a Node.js verzióját;
- a futási környezetet;
- az uptime értéket;
- a legacy API és health réteg kompatibilitási állapotát.

Nem adja vissza a titkos kulcsokat, a Bearer tokent vagy az Arduino privát
útvonalát.

**Sikeres státusz:** `200`
**Hitelesítési hiba:** `401`, `UNAUTHORIZED`
**Hiányzó szerverkonfiguráció:** `503`, `API_V2_AUTH_NOT_CONFIGURED`

### `GET /api/v2/arduino/status`

Védett végpont, amely rövid timeouttal lekéri az Arduino jelenlegi
`/api/status` válaszát.

**Sikeres státusz:** `200`

Lehetséges hibák:

- `ARDUINO_CONFIG_INVALID` – `503`
- `ARDUINO_UNREACHABLE` – `503`
- `ARDUINO_AUTH_FAILED` – `502`
- `ARDUINO_BAD_RESPONSE` – `502`
- `ARDUINO_TIMEOUT` – `504`


### `GET /api/v2/leds`

Visszaadja az Arduino `/api/led/status` válaszából normalizált LED-listát.

**Jogosultság:** `led:read`
**Szerepkörök:** `viewer`, `operator`, `admin`

### `GET /api/v2/leds/:id`

Visszaadja az 1–3 közötti azonosítójú LED-szalag állapotát.

**Jogosultság:** `led:read`

### `PUT /api/v2/leds/:id`

Részleges LED-beállítás. Legalább egy mező kötelező.

```json
{
  "enabled": true,
  "brightness": 180,
  "effect": 2,
  "speed": 50,
  "color": [255, 40, 0]
}
```

A `color` elfogadott formái:

```json
[255, 40, 0]
```

```json
{"red": 255, "green": 40, "blue": 0}
```

```text
#FF2800
```

Határértékek:

- `brightness`: 0–255;
- `effect`: 0–4;
- `speed`: 1–100;
- RGB komponensek: 0–255.

**Jogosultság:** `led:write`
**Szerepkörök:** `operator`, `admin`

### `POST /api/v2/leds/actions/all-on`

Bekapcsolja mindhárom LED-szalagot.

**Jogosultság:** `led:write`

### `POST /api/v2/leds/actions/all-off`

Kikapcsolja mindhárom LED-szalagot.

**Jogosultság:** `led:write`

### `POST /api/v2/leds/actions/reset`

Alaphelyzetbe állítja a LED-vezérlést.

**Jogosultság:** `led:admin`
**Szerepkör:** `admin`

Lehetséges LED-hibák:

- `INVALID_LED_ID` – 400
- `EMPTY_LED_COMMAND` – 400
- `INVALID_LED_ENABLED` – 400
- `INVALID_LED_BRIGHTNESS` – 400
- `INVALID_LED_EFFECT` – 400
- `INVALID_LED_SPEED` – 400
- `INVALID_LED_COLOR` – 400
- `LED_NOT_FOUND` – 404
- `PERMISSION_REQUIRED` – 403

## 7. Ismeretlen végpont

Az `/api/v2` alatti ismeretlen útvonal mindig az API v2 hibasémáját adja:

```json
{
  "success": false,
  "error": {
    "code": "API_ROUTE_NOT_FOUND",
    "message": "Az API v2 útvonal nem található.",
    "details": {
      "method": "GET",
      "path": "/api/v2/ismeretlen"
    }
  },
  "meta": {
    "requestId": "generated-request-id",
    "timestamp": "2026-07-28T10:00:00.000Z",
    "apiVersion": "2",
    "durationMs": 0
  }
}
```

## 8. CORS

Az engedélyezett eredeteket az `API_V2_ALLOWED_ORIGIN` környezeti változó
tartalmazza. Több eredet vesszővel választható el:

```text
API_V2_ALLOWED_ORIGIN=https://app.example,tauri://localhost
```

A `*` érték csak megbízható belső hálózaton ajánlott. Az API v2 jelenlegi
változata cookie-alapú hitelesítést nem használ.

## 9. Arduino-hitelesítés átmenete

A kliens és az LXC között az API v2 már nem használ URL-paraméteres kulcsot,
hanem `Authorization: Bearer ...` fejlécet.

Az LXC, a legacy gateway és a Tauri közvetlen Arduino kliens az Alpha.3
munkacsomagtól kezdve az alábbi belső eszközhitelesítést használja:

```http
X-Device-Key: <ARDUINO_API_KEY>
```

A kulcs nem kerülhet URL-be, request logba, auditba vagy a macOS `curl`
folyamat argumentumai közé. A firmware `4.1.21` átmenetileg elfogadhatja a
régi `?k=` formátumot, ha `API_ALLOW_QUERY_KEY_FALLBACK=1`, de a query
fallback csak fejléc hiányában használható. Hibás vagy duplikált fejléc nem
kerülhető meg helyes query-kulccsal. A fallback kikapcsolása külön
hardverteszt és firmware-jóváhagyás után történhet.

## 10. Verziózás és törési szabályok

Az `/api/v2` útvonalon belül visszafelé kompatibilis mezők hozzáadhatók.
Meglévő mező eltávolítása, jelentésének megváltoztatása vagy státuszkód
inkompatibilis módosítása új fő API-verziót igényel.

A legacy `/api/...` végpontok csak dokumentált átmeneti időszak után
vezethetők ki.


## 7. Schedule végpontok

Az API v2 schedule végpontjai az Arduino saját SD/EEPROM időzítési
rendszerét kezelik. A régi helyi `weekly-led-schedules.json` API ebben a
munkacsomagban még változatlanul a legacy szerverben marad.

### Jogosultságok

- `schedule:read`: `viewer`, `operator`, `admin`
- `schedule:write`: `operator`, `admin`
- `schedule:admin`: `admin`

### `GET /api/v2/schedules`

Összesített Arduino schedule-állapot és fájllista.

### `GET /api/v2/schedules/status`

Az Arduino `/api/schedule/status` válasza.

### `GET /api/v2/schedules/files`

Az Arduino schedule-fájllistája.

### `GET /api/v2/schedules/days/:day`

A nap indexe `0` (hétfő) és `6` (vasárnap) közötti egész szám.

### `GET /api/v2/schedules/files/:filename`

A fájlnév formátuma: `S0L1.JS` – `S6L3.JS`.

### `GET /api/v2/schedules/debug`

Adminisztrátori Arduino schedule debug válasz.

### `POST /api/v2/schedules/actions/reload`

Az Arduino schedule-fájljainak újratöltése.

### `POST /api/v2/schedules/actions/generate`

Az Arduino schedule-fájljainak újragenerálása.

### `POST /api/v2/schedules/actions/test`

```json
{
  "time": "19:30"
}
```

### `POST /api/v2/schedules/actions/sync`

Legfeljebb 60 hordozható heti időzítést kódol 27 bájtos rekordokra, majd
sorban feltölti az Arduino EEPROM-időzítőjébe.

```json
{
  "schedules": [
    {
      "day": 1,
      "time": "19:30",
      "leds": [
        {
          "id": 1,
          "enabled": true,
          "brightness": 180,
          "effect": 2,
          "speed": 50,
          "color": [255, 40, 0]
        }
      ]
    }
  ]
}
```

A hordozható időzítés `day` mezője `1` (hétfő) és `7` (vasárnap) közötti.

### `DELETE /api/v2/schedules`

Adminisztrátori művelet, amely törli az Arduino schedule-állományát.

Lehetséges schedule hibák:

- `INVALID_SCHEDULE_DAY_INDEX` – 400
- `INVALID_SCHEDULE_WEEKDAY` – 400
- `INVALID_SCHEDULE_TIME` – 400
- `INVALID_SCHEDULE_FILENAME` – 400
- `INVALID_SCHEDULE_LED_*` – 400
- `EMPTY_SCHEDULE_LIST` – 400
- `TOO_MANY_SCHEDULES` – 400
- `SCHEDULE_SYNC_MISMATCH` – 502


## 8. Többtokenes API v2 hitelesítés

Az `API_V2_TOKENS_JSON` több külön Bearer tokent támogat. Minden tokenhez
azonosító, szerepkör és engedélyezett állapot tartozik. A régi
`API_V2_TOKEN` és `API_V2_ROLE` beállítás továbbra is működik tartalékként.

Példa:

```json
[
  {
    "id": "desktop",
    "token": "LEGALÁBB_32_KARAKTERES_VÉLETLEN_TOKEN",
    "role": "admin",
    "enabled": true
  },
  {
    "id": "mobile",
    "token": "MÁSIK_LEGALÁBB_32_KARAKTERES_TOKEN",
    "role": "operator",
    "enabled": true
  }
]
```

A nyilvános discovery válasz csak az aktív tokenek darabszámát mutatja;
tokenazonosítót, szerepkört vagy tokenértéket nem tesz közzé.

## 9. Helyi schedule repository

A helyi repository atomikus fájlcserét, sorba állított írásokat és import
előtti automatikus backupot használ.
Alapértelmezésben külön `weekly-led-schedules-v5.json` fájlt használ, így a
legacy schedule memória nem írja felül közvetlenül.

### `GET /api/v2/local-schedules`

A helyi heti időzítések listája.

### `GET /api/v2/local-schedules/export`

Hordozható exportdokumentumot ad vissza.

### `POST /api/v2/local-schedules`

Egy vagy több napra új időzítést hoz létre.

```json
{
  "days": [1, 3, 5],
  "time": "19:30",
  "leds": [
    {
      "id": 1,
      "enabled": true,
      "brightness": 180,
      "effect": 2,
      "speed": 50,
      "color": [255, 40, 0]
    }
  ]
}
```

### `POST /api/v2/local-schedules/import`

A teljes helyi állományt lecseréli, előtte backupot készít.

### `DELETE /api/v2/local-schedules/:id`

Egy helyi időzítést töröl.

### `POST /api/v2/local-schedules/actions/sync-arduino`

A helyi repository tartalmát az Arduino EEPROM-időzítőjébe szinkronizálja.

### `GET /api/v2/local-schedules/runner`

Az új V5 futtató állapota.

### `POST /api/v2/local-schedules/runner/actions/tick`

Manuálisan lefuttat egy időzítési ellenőrzést. A `force: true` ugyanabban a
percben is engedélyezi az ismételt tesztet.

Az automatikus runner alapértelmezésben `manual`, mert a legacy szerver még
saját percenkénti időzítésfuttatót használ.

## 10. Firmware és OTA

### `GET /api/v2/firmware/status`

Visszaadja az Arduino online állapotát, a telepített és elérhető firmware
adatait, az OTA konfigurációt és az aktuális frissítési állapotgépet.

### `POST /api/v2/firmware/actions/check`

Lekéri és ellenőrzi a konfigurált GitHub release firmware-artifactját.

### `POST /api/v2/firmware/actions/update`

Adminisztrátori művelet. `202 Accepted` választ ad, majd:

1. ellenőrzi az Arduino hálózati és OTA-készenlétét;
2. lekéri a `.ino.bin` és `.ino.bin.sha256` asseteket;
3. ellenőrzi a SHA-256 értéket és a GitHub digestet;
4. méretkorláttal lementi a binárist;
5. argumentumtömbbel, shell nélkül elindítja az `arduinoOTA` eszközt;
6. megvárja az Arduino visszajelentkezését és az új verziót.

Lehetséges firmware hibák:

- `FIRMWARE_UPDATE_BUSY` – 409
- `OTA_NOT_CONFIGURED` – 503
- `ARDUINO_NETWORK_CONFIG_MISSING` – 409
- `FIRMWARE_ARTIFACT_INCOMPLETE` – 502
- `FIRMWARE_BINARY_INVALID` – 502
- `FIRMWARE_CHECKSUM_MISMATCH` – 502
- `FIRMWARE_DIGEST_MISMATCH` – 502


## 12. Session-alapú API v2 hitelesítés

Az API v2 védett végpontjai a Bearer token mellett elfogadják a meglévő
`led_session` cookie-t is. A cookie formátuma és a `config/users.json`
scrypt jelszóadatai kompatibilisek a legacy webes felülettel.

Nyilvános session végpontok:

- `GET /api/v2/auth/status`
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/logout`

A login kérése:

```json
{
  "username": "admin",
  "password": "legalább-tizenkét-karakter"
}
```

## 13. Események és realtime kapcsolat

Védett HTTP végpontok:

- `GET /api/v2/events/status`
- `GET /api/v2/events/recent?limit=50`
- `GET /api/v2/events/recent?topic=led.updated&limit=20`

Socket.IO események:

- `v5:ready` – kapcsolódás utáni szolgáltatás- és eseménytörténet
- `v5:event` – minden V5 esemény egységes borítékban
- az esemény témája, például `led.updated` – célzott esemény
- `v5:events:recent` – kliens által kérhető korlátozott történet

Az eseményboríték:

```json
{
  "id": "uuid",
  "topic": "led.updated",
  "timestamp": "2026-07-28T20:00:00.000Z",
  "payload": {},
  "meta": {}
}
```

Az eseménytörténet csak memóriában él, és alapértelmezésben az utolsó 200
eseményt tartja meg.

## 14. Automatikus LXC rollback

A frissítő minden egészséges commitot `last-known-good-commit` állapotként
rögzít. Sikertelen telepítés, függőségjavítás, systemd-indítás vagy ready health
ellenőrzés esetén:

1. leállítja a szolgáltatást;
2. `git reset --hard` segítségével visszaáll az előző commitra;
3. újratelepíti a futásidejű függőségeket;
4. újraindítja a szolgáltatást;
5. ismét ellenőrzi a live és ready végpontokat.

A rollback nem futtat `git clean` parancsot, így nem törli a repositoryban
található nem követett futásidejű adatokat.

## 12. Felhasználó-adminisztráció

A felhasználó-adminisztráció `user:admin` jogosultságot igényel.

- `GET /api/v2/users`
- `POST /api/v2/users`
- `PATCH /api/v2/users/:username`
- `PUT /api/v2/users/:username/password`
- `DELETE /api/v2/users/:username`

A válaszok soha nem tartalmaznak sót vagy jelszóhash-t. A szerepkör,
engedélyezettség vagy jelszó módosítása növeli a `sessionVersion` értékét,
így a korábbi munkamenetek érvénytelenné válnak. Az utolsó engedélyezett
adminisztrátor nem tiltható le és nem törölhető.

## 13. Session CSRF-védelem

Bearer tokennél nincs külön CSRF-követelmény. `led_session` cookie-val
végzett `POST`, `PUT`, `PATCH` és `DELETE` kéréshez a kliens előbb lekéri:

```text
GET /api/v2/auth/csrf
```

Majd a visszakapott tokent elküldi:

```text
X-CSRF-Token: <token>
```

## 14. OpenAPI és dokumentáció

- `GET /api/v2/openapi.json`
- `GET /api/v2/openapi/status`
- `GET /api/v2/docs`

A gépi dokumentum OpenAPI 3.1 formátumú, és a
`docs/api/openapi-v2.json` fájlban is megtalálható.

## 15. Megfigyelhetőség

- `GET /api/v2/metrics`
- `GET /api/v2/diagnostics`
- `GET /api/v2/audit/status`
- `GET /api/v2/audit/recent`
- `GET /api/v2/events/recent?source=persistent`

Az auditnapló rekurzívan kitakarja a jelszó-, token-, cookie-, API-kulcs-
és OTA-titok mezőket. A tartós eseménytár és az auditnapló méretkorlát
elérésekor rotálódik.

## 16. Helyi schedule módosítása

```text
PUT /api/v2/local-schedules/:id
```

A művelet megtartja az időzítés azonosítóját, újra validálja a teljes
schedule objektumot, atomikusan ment, majd `local-schedule.updated`
eseményt publikál.


## Legacy szolgáltatásadapterek

A V5 indító a régi webes kliens által használt `/api/...` útvonalak elé
kompatibilitási adaptereket regisztrál. Az adapterek ugyanazt a régi,
burkolat nélküli JSON-válaszformátumot adják vissza, de már a közös V5
szolgáltatásokat használják.

Alapértelmezésben átállított területek:

- session status, login és logout;
- Arduino status, config, memory és LED status;
- LED vezérlés, all-on, all-off és reset;
- Arduino schedule status, fájlok és műveletek;
- Arduino célgép beállítása;
- firmware status és OTA update.

A helyi schedule adapter külön kapcsolható be:

```text
LEGACY_LOCAL_SCHEDULE_ADAPTERS_ENABLED=0
```

Az érték azért marad alapból `0`, mert a legacy szerver saját percenkénti cron
folyamata még memóriában tartja a régi schedule-listát.

## Prometheus metrikák

### `GET /api/v2/metrics/prometheus`

Prometheus text exposition 0.0.4 formátum. `metrics:read` jogosultság szükséges.

## Futásidejű Arduino-beállítások

### `GET /api/v2/settings/arduino`

Az aktuális Arduino IP/host és port.

### `PUT /api/v2/settings/arduino`

```json
{
  "arduinoIP": "arduino.local",
  "arduinoPort": 80
}
```

A módosítás atomikusan mentődik a `server-settings.json` fájlba, majd az
Arduino HTTP-kliens és az OTA célcím azonnal frissül.


## Legacy cron cutover, Arduino monitor és konzol

- `GET /api/v2/system/cutover`
- `GET /api/v2/arduino/monitor`
- `POST /api/v2/arduino/monitor/actions/poll`
- `GET /api/v2/arduino/console/logs`
- `GET /api/v2/arduino/console/stats`
- `POST /api/v2/arduino/console/actions/clear`

A V5 indító célzottan letiltja a legacy percenkénti helyi schedule cront és a
30 másodperces Arduino status cront. A helyettesítő szolgáltatások állapota a
`/api/v2/system/cutover` végponton ellenőrizhető.

## Schedule fájlkezelés

- `GET /api/v2/files/schedules`
- `GET /api/v2/files/schedules/:filename`
- `POST /api/v2/files/schedules` (`multipart/form-data`, `file` mező)

Csak `S0L1.JS`–`S6L3.JS` formátumú, érvényes JSON-fájl menthető. A szerver
atomikus fájlcserét használ, és nem ad vissza abszolút helyi fájlútvonalat.
Az Arduino-feltöltés csak akkor fut, ha az
`ARDUINO_SCHEDULE_UPLOAD_ENDPOINT` explicit be van állítva.

## Statikus webes réteg

- `GET /api/v2/web/status`

A `public/` könyvtár kiszolgálása külön Express installerben történik. A nagy,
inline legacy dashboard egyelőre kompatibilitási tartalékként megmarad.


## Forgatható API-tokenek

- `GET /api/v2/tokens`
- `POST /api/v2/tokens`
- `PATCH /api/v2/tokens/:id`
- `POST /api/v2/tokens/:id/actions/rotate`
- `DELETE /api/v2/tokens/:id`

Az új token csak a létrehozási vagy rotációs válaszban jelenik meg. A
repository kizárólag SHA-256 lenyomatot tárol. Az utolsó aktív admin token
nem tiltható le és nem törölhető, kivéve, ha aktív konfigurációs admin token
is rendelkezésre áll.

## Firmware backup és rollback

- `GET /api/v2/firmware/backups`
- `POST /api/v2/firmware/actions/rollback`
- `POST /api/v2/firmware/actions/cancel`
- `DELETE /api/v2/firmware/backups/:id`

A rollback kizárólag SHA-256 ellenőrzött, helyi backupból indulhat.


## Rendszerüzemeltetési végpontok

- `GET /api/v2/system/release`
- `GET /api/v2/system/preflight`
- `GET /api/v2/system/maintenance`
- `PUT /api/v2/system/maintenance`
- `DELETE /api/v2/system/maintenance`
- `GET /api/v2/system/snapshots`
- `POST /api/v2/system/snapshots`
- `GET /api/v2/system/snapshots/:id/verify`
- `POST /api/v2/system/snapshots/:id/actions/restore`
- `DELETE /api/v2/system/snapshots/:id`
- `GET /api/v2/system/migrations`
- `POST /api/v2/system/migrations/actions/dry-run`
- `POST /api/v2/system/migrations/actions/apply`

A snapshot restore csak aktív karbantartási módban és
`RESTORE_SYSTEM_SNAPSHOT` megerősítéssel fut.


## Alpha.2 release-gate és promóció

- `GET /api/v2/release/status`
- `GET /api/v2/release/metadata`
- `GET /api/v2/release/promotion-readiness`
- `POST /api/v2/release/actions/verify-gate`
- `POST /api/v2/release/actions/approve-promotion`
- `DELETE /api/v2/release/promotion-approval`

A jóváhagyás csak akkor hozható létre, ha:

1. a gate jelentés `passed`;
2. a jelentés a jelenlegi Git commitra készült;
3. a jelentés nem régebbi a konfigurált időkorlátnál;
4. a konfigurációs preflight kész;
5. nincs függő migráció;
6. nincs aktív karbantartási mód.

A jóváhagyási kérés kötelező értéke:

```text
APPROVE_ALPHA2_PROMOTION
```

A jóváhagyás nem emeli meg automatikusan a projektverziót és nem készít Git
commitot. A közvetlen `5.0.0-alpha.2` verziószinkron külön, gate utáni
release-csomagban történik.

## Alpha.2 execution és finalization

```text
GET    /api/v2/release/execution-receipts
GET    /api/v2/release/finalization-readiness
POST   /api/v2/release/actions/verify-finalization
POST   /api/v2/release/actions/approve-finalization
DELETE /api/v2/release/finalization-approval
```

A véglegesítési jóváhagyás pontos megerősítése:

```text
FINALIZE_ALPHA2_VERSION_SYNC
```

A jóváhagyás nem módosít verziófájlt és nem készít Git commitot. A readiness
csak akkor `ready`, ha a staging deployment, rollback rehearsal és promotion
deployment receipt ugyanarra a candidate commitra mutat, az evidence fázisok
helyesek, és a receipt SHA-256 előzménylánc folytonos.
