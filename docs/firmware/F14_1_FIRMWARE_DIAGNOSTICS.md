# F14.1 – firmware-diagnosztika és kapcsolatstabilizálás

**Alapcommit:** `4893a2df1d6901d85a62e62f29d06d7071206709`
**Előző firmware:** `4.1.21`
**Új firmware:** `4.2.0-beta.1`
**Feature:** `f14.1-diagnostics-direct-api-v1`

## Megvalósított elemek

- helyes, privát útvonalat tartalmazó legacy és Direct API v1 URL a bootkonzolon;
- stabil eszközazonosító és boot ID;
- eszközkulcs-ujjlenyomat, teljes kulcs automatikus kiírása nélkül;
- request ID minden HTTP válaszban és `X-Request-Id` válaszfejléc;
- egységes JSON hibaséma;
- hibás privát útvonalra `404`;
- ismeretlen végpontra `404`;
- hibás metódusra `405`;
- fejléc-timeoutra `408`;
- hiányzó vagy hibás kulcsra `401`;
- duplikált `X-Device-Key` fejlécre `400`;
- kliens-IP, metódus, megtisztított útvonal, auth eredmény, státuszkód és időtartam;
- gyakori polling 30 másodperces összesítése;
- `http trace on/off`, automatikus 10 perces kikapcsolással;
- USB Serial parancskezelő;
- titokmentes `profile show`;
- explicit `profile export secrets`;
- read-only Direct API v1 diagnosztikai végpontok;
- a 4.1.21 legacy LED-, schedule-, konzol- és OTA-endpointok megtartása;
- a jelenlegi EEPROM-layout kompatibilis megtartása.

## F14.1 Direct API v1 végpontok

```text
GET  /api/v1/ping
GET  /api/v1/capabilities
GET  /api/v1/status
GET  /api/v1/diagnostics
GET  /api/v1/config/status
GET  /api/v1/logs
GET  /api/v1/logs/stats
POST /api/v1/logs/clear
GET  /api/v1/ota/status
POST /api/v1/ota/prepare
GET  /api/v1/schedules/status
```

Az F14.1 még nem valósítja meg a teljes JSON body alapú LED- és schedule-v1 API-t.
Ezek az F14.2 feladatai.

## Serial parancsok

```text
help
status
network
api status
api url
api test
http stats
http trace on
http trace off
profile show
profile export secrets
eeprom status
schedule status
schedule list
logs
logs clear
ota status
reboot
```

## Titokbiztonság

Hálózati API-válasz soha nem tartalmaz API-kulcsot, privát útvonalat,
OTA-jelszót vagy Wi-Fi-jelszót. A teljes kliensprofil kizárólag USB Serialon,
explicit `profile export secrets` paranccsal jelenik meg a
`[profile-secret-begin]` és `[profile-secret-end]` markerek között.

## Átmeneti korlátok

Az F14.1 megtartja a `?k=` query fallbacket, a legacy query-alapú módosító
végpontokat és az egyetlen példányos 4.1 EEPROM-layoutot. Ezeket az F14.2 és
F14.3 szünteti meg. A forrás csak Arduino CLI fordítás és valós hardverteszt
után tekinthető lezárt F14.1 firmware-nek.

## F14.1.1 SRAM-hotfix

Az első valódi UNO R4 WiFi linkelésnél a diagnosztikai build 48 bájttal
átfedte a Renesas core által fenntartott heap és stack tartományt.

A javítás:

- RAM-log kapacitás: `48 -> 32`;
- logüzenet: `144 -> 128` bájt;
- közös HTTP JSON buffer: `3072 -> 2560` bájt;
- Serial parancsbuffer: `192 -> 160` bájt;
- a schedule teljes importjából eltávolítva az 1620 bájtos lokális
  `StoredSchedule[60]` stacktömb;
- kétmenetes schedule-validáció egyetlen 27 bájtos ideiglenes rekorddal;
- fordítási `static_assert` védi az EEPROM-struktúrák méretét és a
  diagnosztikai pufferek felső határát.

A módosítás több mint 3 kB statikus SRAM-ot szabadít fel, és megszüntet egy
külön, futás közbeni 1620 bájtos stackcsúcsot. A tényleges linkereredményt az
Arduino CLI hardveres kapuban kell rögzíteni.

## F14.1.2 – UNO R4 memóriajelentés javítása

Az F14.1.1 után a valódi UNO R4 WiFi fordítás sikeres:

```text
Sketch uses 107812 bytes (41%) of program storage space.
Global variables use 19640 bytes (59%) of dynamic memory,
leaving 13128 bytes for local variables.
```

A korábbi ellenőrző blokk ezután külön `arm-none-eabi-size` hívással
`26672` bájtos BSS értéket kapott, és ezt tévesen összehasonlította a
`21500` bájtos globálisváltozó-limittel.

A két szám nem azonos jelentésű:

- az Arduino platform memóriajelentése a `.data` és `.bss` globális
  használatát adja össze;
- a nyers ELF szekció-összesítés a Renesas linker `NOLOAD` runtime
  területeit, köztük a fenntartott `.heap` területet is tartalmazhatja;
- ezért a nyers BSS-ből számított `32768 - BSS` nem a tényleges szabad
  stack- és lokálisváltozó-terület.

Az F14.1.2 kapu ezért az Arduino CLI fordítás saját összegző sorait használja.

Elfogadási határ az F14.1 fázisban:

```text
Arduino által jelentett globális memória: legfeljebb 21500 bájt
Arduino által jelentett szabad lokális memória: legalább 10000 bájt
```

A jelenlegi mérés:

```text
globális memória: 19640 bájt – MEGFELEL
szabad lokális memória: 13128 bájt – MEGFELEL
```

Ez a javítás nem növeli a firmware memóriahasználatát és nem módosítja az
Arduino firmware-forrását.
