# Firmware Event Code Protocol v1

## Cél
A firmware emberi nyelvű logmondatai helyett stabil eseménykódot és paramétereket küld.
A fordítás HU / EN / DE oldalon a frontend feladata.

## Formátum
`Xdddd[:param1[:param2...]]`

A Direct API v1 `/logs` sémája nem változik:
- `type` = severity/kategória
- `message` = event code payload

Példa:
`success + X2002:192.168.1.20:-48:80:65280`

HU: Wi-Fi kész: 192.168.1.20 · -48 dBm · HTTP 80 · OTA 65280
EN: Wi-Fi ready: 192.168.1.20 · -48 dBm · HTTP 80 · OTA 65280
DE: Wi-Fi bereit: 192.168.1.20 · -48 dBm · HTTP 80 · OTA 65280

## Tartományok
- X0xxx rendszer / boot / build
- X1xxx konfiguráció / EEPROM / storage
- X2xxx Wi-Fi / NTP / idő
- X3xxx LED / schedule
- X4xxx HTTP / diagnosztika
- X5xxx OTA
- X6xxx rendszervezérlés
- X7xxx health / diagnosztika
- X8xxx fenntartva
- X9xxx belső / kritikus hibák

## Stabilitási szabály
1. Kiadott kód jelentése soha nem változik.
2. Törölt kód nem használható újra.
3. Paramétersorrend a szerződés része.
4. Ismeretlen kódnál a frontend a nyers message-et mutatja.
5. Nem Xdddd kezdetű régi log legacy fallback.
6. A firmware-ben nincs HU/EN/DE fordítótábla.
7. Minden aktív kódhoz HU/EN/DE frontend kulcs tartozik.

## Registry v1
| Kód | Paraméter | Jelentés |
|---|---|---|
| X0001 | - | Controller boot |
| X0002 | version | firmware verzió |
| X0003 | feature | build feature |
| X0004 | port | HTTP szerver elindult |
| X0005 | - | Serial diagnosztika aktív |
| X1001 | - | legacy config A/B migráció |
| X1002 | - | A/B config betöltve |
| X1003 | - | nincs érvényes config |
| X1101 | - | Wi-Fi/OTA EEPROM mentés |
| X1102 | - | Wi-Fi/OTA EEPROM betöltés |
| X1103 | - | érvénytelen Wi-Fi config |
| X1201 | - | API EEPROM mentés |
| X1202 | - | API EEPROM betöltés |
| X1203 | - | API nincs konfigurálva |
| X1301 | - | A/B schedule betöltve |
| X1302 | - | legacy schedule migrálva |
| X1303 | - | nincs érvényes schedule |
| X1304 | - | schedule mentve és verifikálva |
| X1401 | - | timezone EEPROM-ból betöltve |
| X1402 | zone | default timezone |
| X1403 | - | autonóm DST/timezone frissítés |
| X2001 | - | Wi-Fi connect start |
| X2002 | ip,rssi,httpPort,otaPort | Wi-Fi ready |
| X2101 | - | NTP minden szerveren sikertelen |
| X2102 | - | UDP NTP sync |
| X2103 | - | WiFi.getTime sync |
| X3001 | - | manual override lejárt |
| X3002 | - | schedule reconcile |
| X4001 | - | HTTP trace auto off |
| X4002 | - | HTTP trace on |
| X4003 | - | HTTP trace off |
| X5001 | ip,port | OTA receiver active |
| X5003 | errorCode,seconds | OTA error |
| X6001 | - | remote reboot execute |

## RAM / flash
Ebben a fázisban a `message[80]` kompatibilitási okból megmarad.
A megtakarítás elsősorban:
- rövidebb firmware string literalok,
- rövidebb hálózati payload,
- automatikus teljes magyar CONNECTION blokk kikerülése a RAM logból.

Az APPLY script a firmware fordítás előtti és utáni sketch-byte értéket is kiírja.
A megtakarításról a mérés dönt, nem becslés.

## Serial
Az explicit USB diagnosztikai parancsok egyelőre maradhatnak emberi szövegűek.
A `consoleLine()` viszont többé nem tölti ezeket a Direct API RAM logba.
