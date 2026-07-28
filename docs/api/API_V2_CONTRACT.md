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

Az LXC és a jelenlegi Arduino firmware között átmenetileg megmarad a
`?k=<ARDUINO_API_KEY>` lekérdezési paraméter, mert a jelenlegi firmware ezt
várja. Egy későbbi firmware-verzióban ezt `X-API-Key` vagy más dedikált
fejléc váltja fel. A migráció alatt az LXC lesz a kompatibilitási réteg.

## 10. Verziózás és törési szabályok

Az `/api/v2` útvonalon belül visszafelé kompatibilis mezők hozzáadhatók.
Meglévő mező eltávolítása, jelentésének megváltoztatása vagy státuszkód
inkompatibilis módosítása új fő API-verziót igényel.

A legacy `/api/...` végpontok csak dokumentált átmeneti időszak után
vezethetők ki.
