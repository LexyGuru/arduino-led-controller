# F14.0 – Arduino firmware audit

**Audit alapcommit:** `a70a84e335fe9c3199082269a2ce35502f15a6cc`
**Auditált firmware:** `4.1.21`
**Auditált forrás:** `firmware/ArduinoLedController/ArduinoLedController.ino`
**Célverzió:** `4.2.0-beta.1`
**Állapot:** terv és szerződés; firmware-kódot ez a csomag még nem módosít

## 1. Döntés

A Tauri további funkciófejlesztése szünetel, amíg az Arduino firmware nem
teljesíti az F14.1–F14.4 firmware-kapukat.

```text
1. Arduino diagnosztika és hibaválaszok
2. Arduino Direct API v1
3. EEPROM/schedule tranzakció
4. hardveres stabilitási kapu
5. csak ezután Tauri V15
```

Az Arduino lesz a közvetlen rendszer szerződésének hiteles forrása. A Tauri
nem találgathat útvonalat, portot, hitelesítést vagy schedule-formátumot.

## 2. Jelenlegi hardver- és futtatási modell

A `4.1.21` forrás alapján:

| Tétel | Jelenlegi érték |
|---|---|
| lap | Arduino UNO R4 WiFi |
| firmware | `4.1.21` |
| feature | `device-key-header-4.1.21` |
| HTTP | `80/TCP` |
| OTA | `65280/TCP` |
| mDNS | letiltva |
| LED-szalag | 3 |
| pixel/szalag | 300 |
| LED-pinek | 6, 7, 8 |
| PIR-pinek | 2, 3, 4 |
| schedule maximum | 60 |
| HTTP kliens/loop | 1 |
| RAM konzolkapacitás | 32 bejegyzés |
| log/válasz | legfeljebb 4 bejegyzés |
| HTTP body buffer | 2304 bájt |
| válaszdarab | 512 bájt |
| request line | 256 bájt |
| header line | 192 bájt |

## 3. Jelenlegi endpointleltár

Minden endpoint a következő privát előtag mögött található:

```text
<API_PRIVATE_PATH>/api/...
```

A jelenlegi router globálisan csak `GET` és `POST` metódust enged át, de a
route-kezelő nem köt metódust az egyes műveletekhez.

| Normalizált endpoint | Jelenlegi művelet | Megjegyzés |
|---|---|---|
| `/api/status` | teljes állapot | GET vagy POST |
| `/api/led/status` | teljes állapot alias | GET vagy POST |
| `/api/led/{id}?…` | LED módosítás | query-paraméterek |
| `/api/all-on` | minden LED be | módosító GET is elfogadott |
| `/api/all-off` | minden LED ki | módosító GET is elfogadott |
| `/api/schedules/export?index=` | egy rekord hex export | bináris struktúra hex |
| `/api/schedules/upload?payload=` | teljes hex import | query string |
| `/api/schedules/chunk?…` | darabolt hex import | közvetlenül globális RAM-ba ír |
| `/api/schedules/clear` | schedule törlés | módosító GET is elfogadott |
| `/api/console/logs?after=` | RAM-log lapozás | 4 rekord/válasz |
| `/api/console/stats` | konzol/HTTP statisztika | részleges |
| `/api/console/clear` | RAM-log törlés | módosító GET is elfogadott |
| `/api/ota/status` | OTA állapot | olvasás |
| `/api/ota/prepare` | 30 másodperces OTA ablak | módosító GET/POST |
| `/api/ota/restart` | prepare alias | valójában nem restart |

## 4. Jelenlegi hitelesítés

A firmware két feltételt ellenőriz:

1. a kérés útvonala az EEPROM-ban tárolt `API_PRIVATE_PATH` értékkel
   kezdődik;
2. az `X-Device-Key` fejléc megegyezik az EEPROM-ban tárolt
   `API_SHARED_SECRET` értékkel.

Pozitívumok:

- a fejlécnév kis- és nagybetűtől független;
- duplikált `X-Device-Key` fejléc elutasított;
- a kulcs összehasonlítása konstans idejű;
- a Tauri/Node kliens nem teszi a kulcsot URL-be;
- a query-kulcsot a firmware eltávolítja a naplózott útvonalból.

Nyitott problémák:

- `API_ALLOW_QUERY_KEY_FALLBACK` alapértéke és példakonfigurációja `1`;
- a régi `?k=` kulcs még elfogadott;
- nincs API-verzió;
- nincs request ID;
- nincs egységes hibaséma;
- nincs kulcs-ujjlenyomat a diagnosztikában;
- nincs USB-s, explicit titkos profil-export.

## 5. Kapcsolati és diagnosztikai hibák

### F14-AUD-001 – hibás konzol-URL

A bootkonzol ezt írja:

```text
http://<IP>:80/api/status
```

A firmware valójában csak ezt fogadja:

```text
http://<IP>:80/<API_PRIVATE_PATH>/api/status
```

Ez közvetlenül félrevezeti a felhasználót és a kézi tesztet.

### F14-AUD-002 – néma útvonal- és metóduselutasítás

Hibás HTTP-metódus vagy privát útvonal esetén a firmware növeli a rejected
számlálót, majd JSON-válasz nélkül lezárja a TCP-kapcsolatot.

Következmény:

- a kliens timeoutot vagy üres kapcsolatot lát;
- nincs `404` vagy `405`;
- a soros konzolból nem derül ki az ok.

### F14-AUD-003 – hiányos kliensnapló

A gyakori statusz-, LED-statusz-, konzol- és OTA-statusz pollingnál a
firmware nem kérdezi le a `remoteIP()` értéket. Ezeknél a
`lastClientIp` értéke `-`.

A nem polling kérések is legfeljebb 15 másodpercenként kerülnek a
konzolnaplóba.

Következmény:

- nem látszik, hogy a Tauri valóban eléri-e az Arduinót;
- nem különíthető el a helyi és távoli kliens;
- nincs kérésenkénti válaszkód és időtartam.

### F14-AUD-004 – nem szabványos endpoint-hibák

Az ismeretlen API-végpont `400 Bad Request` választ ad `404 Not Found`
helyett.

A státusztábla nem támogatja:

- `405 Method Not Allowed`;
- `413 Payload Too Large`;
- `409 Conflict`;
- `422 Unprocessable Content`;
- `429 Too Many Requests`.

### F14-AUD-005 – nincs HTTP body feldolgozás

A firmware csak request line-t és headereket olvas. Nincs:

- `Content-Length`;
- JSON body;
- body-size limithez kötött `413`;
- content-type ellenőrzés;
- atomikus request payload.

Emiatt a LED- és schedule-módosítás query stringben történik.

## 6. Schedule- és EEPROM-hibák

### F14-AUD-006 – schedule header kerül először EEPROM-ba

A jelenlegi mentési sorrend:

```text
1. ScheduleHeader írása
2. schedule rekordok írása
```

Áramkimaradás esetén az új header egy régi vagy részben kiírt payloadra
mutathat. A checksum ezt később észleli, de nincs előző érvényes példány.

### F14-AUD-007 – nincs write/readback ellenőrzés

A `saveSchedules()` sikerrel tér vissza anélkül, hogy:

- visszaolvasná az EEPROM-ot;
- ellenőrizné a checksumot;
- ellenőrizné a count értéket;
- generációt/revisiont növelne.

### F14-AUD-008 – chunk import közvetlenül az aktív RAM-ba ír

A darabolt schedule-import minden chunkot közvetlenül a globális
`schedules[]` tömbbe dekódol. Az EEPROM csak az utolsó chunknál íródik.

Következmény:

- félbeszakított import után részlegesen módosított RAM maradhat;
- nincs upload ID;
- nincs staging buffer;
- nincs sorrend- és duplikációvédelem.

### F14-AUD-009 – ABI-függő konfigurációs struktúrák

A `NetworkSettings` és `ApiSettings` nincs packed formában, miközben fix
EEPROM-offsetekre kerülnek.

A célhardver fix, de a szerződésből hiányzik:

- `static_assert(sizeof(...))`;
- explicit layout-verzió;
- generáció;
- A/B slot;
- migrációs marker.

## 7. RAM- és String-kockázatok

A firmware több helyen dinamikus Arduino `String` objektumokat használ:

- request line feldolgozás;
- query parsing;
- schedule hex encode/decode;
- válaszépítés bizonyos endpointoknál;
- privát útvonal normalizálás.

Az UNO R4 32 kB SRAM-mal rendelkezik, ezért a jelenlegi 2304 bájtos fix
HTTP buffer mellett a hosszú futású fragmentációt hardveres soak teszttel
kell mérni.

F14.1-ben nem kötelező minden `String` azonnali eltávolítása, de:

- HTTP body fix bufferből olvasandó;
- válaszok fix bufferből építendők;
- schedule upload nem használhat többszörös nagy String-másolatot;
- a szabad memória/heap trend bekerül a diagnosztikába, ha a core ezt
  megbízhatóan támogatja.

## 8. OTA audit

Pozitívumok:

- fix `65280/TCP`;
- az OTA listener tartósan fut;
- nincs `ArduinoOTA.end()` újranyitási instabilitás;
- OTA alatt HTTP, NTP, schedule és LED-animáció szünetel;
- vizuális állapot és hibajelzés létezik.

Nyitott problémák:

- az `/api/ota/restart` elnevezés félrevezető;
- nincs request ID;
- nincs egységes error schema;
- nincs kliens-IP/forrás audit;
- nincs OTA prepare token vagy nonce;
- az OTA-portot külön hálózati szabállyal kell helyi/VPN elérésre
  korlátozni.

## 9. Javítási prioritások

| Prioritás | Tétel | Csomag |
|---|---|---|
| P0 | helyes bootkonzol API-cím | F14.1 |
| P0 | minden hibára HTTP/JSON válasz | F14.1 |
| P0 | kérésazonosító és kapcsolati audit | F14.1 |
| P0 | Serial parancskezelő és secret profil-export | F14.1 |
| P0 | `/api/v1` és metódusszerződés | F14.2 |
| P0 | query key fallback kikapcsolása | F14.2 |
| P0 | JSON body és payload limit | F14.2 |
| P0 | schedule staging + A/B EEPROM | F14.3 |
| P1 | capabilities/config status | F14.1/F14.2 |
| P1 | log summary/trace mód | F14.1 |
| P1 | kulcs- és config-ujjlenyomat | F14.1 |
| P1 | hosszú futás és több kliens | F14.4 |
| P2 | hitelesített kulcsrotáció | későbbi firmware |
| P2 | biztonságos pairing | későbbi firmware |

## 10. Kilépési feltétel

Az F14.0 akkor tekinthető késznek, ha:

- az endpointleltár rögzített;
- az EEPROM jelenlegi és cél-layoutja rögzített;
- az API v1 OpenAPI dokumentum érvényes JSON;
- a Serial parancsszerződés rögzített;
- a hardveres acceptance matrix rögzített;
- a repository teszt bizonyítja a jelenlegi hibák és a célterv
  dokumentálását;
- a Tauri roadmap firmware-first kapu mögé kerül.
