# Arduino EEPROM layout – 4.1.21 audit és 4.2 cél

Az Arduino UNO R4 WiFi 8 kB EEPROM-területet biztosít. A jelenlegi firmware
három külön tartományt használ, de csak egy példányban tárolja őket.

## 1. Jelenlegi 4.1.21 layout

| Kezdő offset | Tartalom | Struktúra |
|---:|---|---|
| 0 | Wi-Fi és OTA | `NetworkSettings` |
| 256 | schedule header + maximum 60 rekord | `ScheduleHeader` + `StoredSchedule[60]` |
| 2300 | privát API útvonal és eszközkulcs | `ApiSettings` |

### Schedule pontos méretek

A schedule struktúrák packed formájúak:

```text
StoredLed      = 8 bájt
StoredSchedule = 3 + (3 × 8) = 27 bájt
ScheduleHeader = 4 + 1 + 1 + 4 = 10 bájt
60 rekord      = 1620 bájt
teljes schedule tartomány = 1630 bájt
```

Jelenlegi schedule tartomány:

```text
offset 256 ... 1885
```

Az API tartomány 2300-nál kezdődik, így jelenleg van rés, de a két
konfigurációs struktúra ABI-függő, mert nincs packed/static_assert
szerződésük.

## 2. Jelenlegi integritás

Minden blokk FNV-1a jellegű 32 bites checksumot használ.

Pozitívum:

- sérült schedule checksum felismerhető;
- placeholder build nem írja felül automatikusan az érvényes titkokat.

Korlát:

- nincs generáció;
- nincs A/B slot;
- nincs readback mentés után;
- nincs aktív slot marker;
- nincs rollback;
- invalid magic/version/count esetén a schedule load részben néma;
- a header kerül kiírásra a payload előtt.

## 3. F14.3 cél-layout

Az új layout egyetlen verziózott firmware storage domainként kezelje a
konfigurációt és külön A/B schedule slotot használjon.

Javasolt kiosztás az 8192 bájtos területen:

| Offset | Hossz | Tartalom |
|---:|---:|---|
| 0 | 64 | storage superblock A |
| 64 | 64 | storage superblock B |
| 128 | 384 | network/API/OTA config slot A |
| 512 | 384 | network/API/OTA config slot B |
| 896 | 1792 | schedule slot A |
| 2688 | 1792 | schedule slot B |
| 4480 | 512 | tartalék konfiguráció/migráció |
| 4992 | 3200 | jövőbeli bővítés |

A konkrét C++ méreteket F14.3-ban fordítási `static_assert` védi.

## 4. Slot header

Minden slot:

```cpp
struct PackedSlotHeader {
  uint32_t magic;
  uint16_t schemaVersion;
  uint16_t payloadLength;
  uint32_t generation;
  uint32_t checksum;
  uint8_t state;
  uint8_t reserved[7];
};
```

Állapot:

```text
EMPTY
WRITING
VALID
RETIRED
```

A `state` módosítása csak a teljes payload readback ellenőrzése után
történhet.

## 5. Mentési algoritmus

1. aktív slot kiválasztása a legmagasabb valid generation alapján;
2. inaktív slot header `WRITING`;
3. payload írás;
4. payload visszaolvasás;
5. checksum ellenőrzés;
6. inaktív slot header `VALID`;
7. régi slot `RETIRED`;
8. RAM állapot cseréje;
9. auditlog.

Hiba esetén a korábbi `VALID` slot marad aktív.

## 6. 4.1.21 migráció

Első `4.2.0-beta.1` boot:

1. új A/B layout keresése;
2. ha nincs, régi 4.1.21 blokkok olvasása;
3. régi checksum és tartomány ellenőrzése;
4. új slotok létrehozása;
5. readback;
6. migration-complete marker;
7. a régi tartomány nem törlődik az első sikeres boot során.

A migráció nem írhat placeholder titkot az EEPROM-ba.

## 7. Kötelező diagnosztika

`eeprom status` és `/api/v1/diagnostics` jelenítse meg:

- storage schema;
- aktív config slot;
- config generation;
- config checksum valid;
- aktív schedule slot;
- schedule generation/revision;
- schedule count;
- schedule checksum valid;
- legacy migration állapot;
- utolsó write/readback eredmény.

Titokérték nem jelenhet meg.
