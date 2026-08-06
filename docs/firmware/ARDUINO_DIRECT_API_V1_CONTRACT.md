# Arduino Direct API v1 szerződés

**Tervezett firmware:** `4.2.0-beta.1`
**Base path:** `<API_PRIVATE_PATH>/api/v1`
**Hitelesítés:** `X-Device-Key`
**Formátum:** JSON UTF-8
**Állapot:** F14.0 tervezési szerződés

A géppel olvasható OpenAPI dokumentum:

```text
docs/api/arduino-direct-api-v1.json
```

## 1. Alapszabályok

1. Minden API-végpont a privát útvonal mögött található.
2. Minden API-kéréshez kötelező az `X-Device-Key`.
3. A kulcs URL-ben nem küldhető.
4. A `?k=` query fallback nincs támogatva.
5. Olvasás: `GET`.
6. Létrehozás/parancs: `POST`.
7. Teljes állapotcsere: `PUT`.
8. Törlés: `DELETE`.
9. Módosító kéréshez `Content-Type: application/json`.
10. Minden válasz tartalmaz `requestId` értéket.

## 2. Kérésazonosító

Az Arduino minden TCP-kéréshez monoton növekvő `uint32_t` request ID-t
rendel.

Válaszfejléc:

```http
X-Request-Id: 184
```

JSON:

```json
{
  "success": true,
  "requestId": 184
}
```

A számláló reboot után újraindulhat. A diagnosztikában a boot ID-val együtt
válik egyedivé.

## 3. Egységes hibaséma

```json
{
  "success": false,
  "requestId": 184,
  "error": {
    "code": "INVALID_DEVICE_KEY",
    "message": "Az X-Device-Key hiányzik vagy hibás."
  }
}
```

Kötelező hibakódok:

| HTTP | Kód |
|---:|---|
| 400 | `BAD_REQUEST` |
| 400 | `DUPLICATE_DEVICE_KEY_HEADER` |
| 400 | `INVALID_JSON` |
| 401 | `MISSING_DEVICE_KEY` |
| 401 | `INVALID_DEVICE_KEY` |
| 404 | `PRIVATE_PATH_NOT_FOUND` |
| 404 | `ENDPOINT_NOT_FOUND` |
| 405 | `METHOD_NOT_ALLOWED` |
| 409 | `REVISION_CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 422 | `VALIDATION_FAILED` |
| 503 | `OTA_TRANSFER_ACTIVE` |
| 503 | `TIME_NOT_SYNCED` |
| 500 | `EEPROM_WRITE_FAILED` |
| 500 | `EEPROM_VERIFY_FAILED` |
| 500 | `INTERNAL_ERROR` |

## 4. Endpointok

### Alap és diagnosztika

| Metódus | Endpoint | Funkció |
|---|---|---|
| GET | `/ping` | minimális hitelesített válasz |
| GET | `/capabilities` | firmware/API képességek |
| GET | `/status` | teljes állapot |

A `config/status` soha nem ad vissza titkot.

Példa:

```json
{
  "success": true,
  "requestId": 12,
  "networkConfigured": true,
  "apiConfigured": true,
  "deviceKeyConfigured": true,
  "deviceKeyFingerprint": "84A2-19F0",
  "otaPasswordConfigured": true,
  "scheduleStored": true
}
```

### LED

| Metódus | Endpoint | Funkció |
|---|---|---|
| GET | `/leds` | mindhárom LED állapota |
| GET | `/leds/{ledId}` | egy LED állapota |
| PUT | `/leds/{ledId}` | egy LED teljes/ részleges állapotfrissítése |
| POST | `/leds/all` | közös parancs mindhárom szalagra |

LED payload:

```json
{
  "enabled": true,
  "brightness": 150,
  "effect": 2,
  "speed": 40,
  "color": [0, 80, 255]
}
```

Validáció:

- `ledId`: 1–3;
- brightness: 0–255;
- effect: 0–4;
- speed: 1–100;
- RGB: 0–255;
- ismeretlen mező alapértelmezetten elutasított.

### Schedule

| Metódus | Endpoint | Funkció |
|---|---|---|
| GET | `/schedules` | teljes schedule JSON |
| PUT | `/schedules` | teljes atomikus schedule-csere |
| DELETE | `/schedules` | teljes schedule törlése |
| GET | `/schedules/status` | count, revision, checksum, slot |

Schedule PUT:

```json
{
  "expectedRevision": 12,
  "entries": [
    {
      "day": 1,
      "time": "18:00",
      "leds": [
        {
          "id": 1,
          "apply": true,
          "enabled": true,
          "brightness": 128,
          "effect": 0,
          "speed": 50,
          "color": [255, 255, 255]
        }
      ]
    }
  ]
}
```

Folyamat:

1. teljes JSON beolvasás staging bufferbe;
2. séma- és tartományvalidáció;
3. expectedRevision ellenőrzése;
4. inaktív EEPROM-slot írása;
5. readback és checksum;
6. slot aktiválása;
7. RAM schedule cseréje;
8. válasz új revisionnel.

### Log

| Metódus | Endpoint | Funkció |
|---|---|---|
| GET | `/logs?afterId=` | események lapozása |
| POST | `/logs/clear` | RAM-log törlése |

A log nem tartalmazhat:

- eszközkulcsot;
- query kulcsot;
- OTA-jelszót;
- Wi-Fi-jelszót;
- teljes auth headert.

### OTA

| Metódus | Endpoint | Funkció |
|---|---|---|
| GET | `/ota/status` | OTA listener állapot |
| POST | `/ota/prepare` | rövid prepare ablak |

Az `/ota/restart` alias megszűnik.

## 5. HTTP parser követelmények

- maximum request line: 256 bájt;
- maximum egy header line: 192 bájt;
- maximum összes header: explicit limit;
- maximum JSON body: kezdetben 4096 bájt vagy a firmware fordítási
  memóriatesztje alapján kisebb;
- `Content-Length` kötelező módosító kérésnél;
- chunked transfer nem támogatott;
- HTTP keep-alive nem támogatott;
- minden válasz `Connection: close`;
- túlméretes body: `413`;
- hiányos body: `400`;
- OTA transfer alatt: `503`.

## 6. Kompatibilitás

A `4.2.0-beta.1` átmenetileg megtarthat olvasási aliasokat:

```text
/api/status
/api/led/status
/api/console/logs
/api/console/stats
/api/ota/status
```

A módosító legacy query endpointok nem maradhatnak a stabil API-ban.

A Tauri V15 kizárólag `/api/v1` végpontot használ.

## Release-size profile

A firmware release buildben a duplikált diagnosztikai végpontok és a teljes USB parancsdiagnosztika ki vannak kapcsolva. A fő `/api/v1/status`, `/api/v1/logs`, OTA, időzóna, schedule és LED JSON API változatlanul elérhető.
