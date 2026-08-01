# Tauri Direct API v1 transport

## Cél

A desktop alkalmazás a firmware tényleges Direct API v1 szerződését használja. A távoli és a helyi kapcsolat külön protokollt és portot kap:

- távoli: `https://beta-lexyguruhome.ddns.net:443`;
- helyi: `http://10.0.0.117:80`;
- mindkét címhez ugyanaz a privát API-prefix és `X-Device-Key` tartozik.

A hálózati napló mindig a ténylegesen használt protokollt, hostot, portot, HTTP-metódust és végpontot rögzíti.

## JSON-kliens

A Rust transport egyetlen általános JSON-kérést használ `GET`, `POST`, `PUT` és `DELETE` metódushoz. A kérés:

- `Accept: application/json` fejlécet küld;
- JSON body esetén `Content-Type: application/json` fejlécet használ;
- elküldi az `X-Device-Key` fejlécet;
- HTTPS és HTTP célokat célpontonként külön kezel;
- a nem sikeres HTTP-válasz státuszát és rövid válaszrészletét is naplózza.

## Direct API v1 végpontok

- státusz: `GET /api/v1/status`;
- konzol: `GET /api/v1/logs?afterId=...`;
- LED: `PUT /api/v1/leds/{id}` JSON bodyval;
- schedule státusz: `GET /api/v1/schedules/status`;
- schedule lap: `GET /api/v1/schedules?offset=...&limit=8`;
- tranzakció indítása: `POST /api/v1/schedules/transactions`;
- tranzakciós chunk: `PUT /api/v1/schedules/transactions/{id}/chunks`;
- commit: `POST /api/v1/schedules/transactions/{id}/commit`;
- rollback: `DELETE /api/v1/schedules/transactions/{id}`;
- OTA előkészítés: `POST /api/v1/ota/prepare`;
- OTA státusz: `GET /api/v1/ota/status`.

## Schedule integritás

A letöltés nyolcas oldalakon történik. Minden oldal revision és count értékének egyeznie kell a kezdő státusszal. Feltöltéskor a kliens:

1. kiolvassa az aktuális revisiont;
2. tranzakciót nyit az elvárt revisionnel és elemszámmal;
3. minden rekordot PUT chunkként küld;
4. commitot kér;
5. újra lekéri a státuszt;
6. teljes lapozott readbacket végez;
7. a visszaolvasott bináris schedule payloadokat összehasonlítja a feltöltöttekkel.

Bármely chunk vagy commit hiba esetén a kliens megpróbálja DELETE kéréssel visszavonni a tranzakciót.

## OTA-zárolás

Az `ota_in_progress` továbbra is blokkolja a nem OTA jellegű módosításokat, de nem blokkolja:

- `GET /api/v1/status`;
- `GET /api/v1/ota/status`;
- `POST /api/v1/ota/prepare`.

Így az OTA saját előkészítése és állapotellenőrzése nem akad fenn a kliens saját zárolásán.
