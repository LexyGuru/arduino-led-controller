# F14.1.3 – UNO R4 WiFi HTTP response transport

**Alapcommit:** `e31fa0e1f1123b6d2810c330c43fdb581e26b496`
**Firmware:** `4.2.0-beta.1`
**Feature:** `f14.1.3-wifis3-response-transport`

## Hardveres bizonyíték

Sikeres:

```text
GET /api/v1/ping
HTTP/1.1 200 OK
Content-Length: 154
```

Sikertelen a javítás előtt:

```text
GET /api/v1/status
curl: (28) timeout, 0 bytes received

GET /api/v1/capabilities
curl: (28) timeout, 0 bytes received
```

A második tesztben a `ping` request ID `8` volt, vagyis az előző
statusz-timeout után az Arduino nem indult újra. Ez kizárta a
firmware-rebootot és az EEPROM/auth hibát.

## Gyökérok

A firmware a bodyt 512 bájtos `WiFiClient.write()` hívásokkal küldte.
A WiFiS3 kliens minden write esetén modem passthrough műveletet indít.
A kis 154 bájtos válasz működött, a nagyobb első body-write elakadt.

A nagy lokális választömbök emellett fölöslegesen terhelték a Renesas
linker által 1024 bájtosra fenntartott stackterületet.

## Javítás

- minden HTTP-fejléc és body legfeljebb 128 bájtos write;
- 2 ms szünet a darabok között;
- explicit flush;
- globális fix HTTP-header buffer;
- minden nagy JSON a közös fix body bufferben épül;
- status és diagnostics kisebb formázási lépésekből áll;
- `http.writeChunkBytes` és `httpResponseChunkBytes` diagnosztikai mező.

## Elfogadási teszt

Mindegyik végpont:

```text
ping
capabilities
status
diagnostics
config/status
schedules/status
logs/stats
ota/status
```

Követelmény:

- `HTTP 200`;
- érvényes JSON;
- legfeljebb 8 másodperc;
- folyamatos request ID;
- nincs reboot;
- `writeFailures` nem növekszik;
- `writeChunkBytes = 128`.
