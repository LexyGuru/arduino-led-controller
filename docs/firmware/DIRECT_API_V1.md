# Arduino Direct API v1

A gépi szerződés: [`docs/api/arduino-direct-api-v1.json`](../api/arduino-direct-api-v1.json).

## Alapok

- verzió: `1.0.0`;
- privát API-előtag kötelező;
- minden védett kérésnél `X-Device-Key` fejléc;
- query-string hitelesítés nem támogatott.

## Fontos endpointok

| Metódus | Útvonal | Funkció |
|---|---|---|
| GET | `/api/v1/ping` | kapcsolat |
| GET | `/api/v1/capabilities` | képességek |
| GET | `/api/v1/status` | teljes állapot |
| GET | `/api/v1/diagnostics` | diagnosztika |
| GET/PUT | `/api/v1/leds/{id}` | egy LED-szalag |
| POST | `/api/v1/leds/all` | közös LED-művelet |
| GET | `/api/v1/schedules` | lapozott schedule |
| GET | `/api/v1/schedules/status` | tárolási állapot |
| POST | `/api/v1/schedules/transactions` | tranzakció kezdése |
| POST | `/api/v1/system/reboot` | késleltetett reboot |
| GET | `/api/v1/ota/status` | OTA állapot |
| POST | `/api/ota/prepare` | OTA ablak |

## Lapozás

A dokumentált paraméter az `offset`; egy válasz legfeljebb 8 rekordot tartalmaz. A legacy `index` paraméter kompatibilitási fallbackként megmaradt, de `offset` jelenlétében az `offset` az elsődleges.
