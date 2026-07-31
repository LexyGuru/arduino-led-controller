# Arduino Direct API v1 – végleges firmware-szerződés

Base path: `<API_PRIVATE_PATH>/api/v1`

Minden kéréshez:

```http
X-Device-Key: <device-key>
```

A kulcs query paraméterben nem használható.

## Végpontok

| Metódus | Végpont |
|---|---|
| GET | `/ping` |
| GET | `/capabilities` |
| GET | `/status` |
| GET | `/diagnostics` |
| GET | `/config/status` |
| GET | `/leds` |
| GET | `/leds/{id}` |
| PUT | `/leds/{id}` |
| POST | `/leds/all` |
| GET | `/schedules?index=0&limit=8` |
| DELETE | `/schedules` |
| GET | `/schedules/status` |
| POST | `/schedules/transactions` |
| PUT | `/schedules/transactions/{id}/chunks` |
| POST | `/schedules/transactions/{id}/commit` |
| DELETE | `/schedules/transactions/{id}` |
| GET | `/logs` |
| GET | `/logs/stats` |
| POST | `/logs/clear` |
| GET | `/ota/status` |
| POST | `/ota/prepare` |

## LED body

```json
{
  "enabled": true,
  "brightness": 128,
  "effect": 0,
  "speed": 50,
  "color": [255, 120, 0]
}
```

## HTTP hibák

- `400`: hiányos body, hibás Content-Type vagy JSON;
- `401`: hiányzó/hibás eszközkulcs;
- `404`: hibás privát útvonal vagy erőforrás;
- `405`: hibás metódus;
- `409`: revision conflict vagy már aktív tranzakció;
- `410`: eltávolított legacy módosító végpont;
- `413`: túl nagy body;
- `422`: tartomány- vagy schedule-validáció;
- `500`: EEPROM write/readback/checksum hiba;
- `503`: OTA vagy átmeneti eszközállapot.
