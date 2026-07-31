# V5 dokumentációs index

## Aktív dokumentáció

- `V5_DIRECT_ARDUINO_ARCHITECTURE.md` – elsődleges rendszerfelépítés
- `V5_DIRECT_ARDUINO_SECURITY.md` – kulcsok, titkos profil és credential store
- `V5_DESKTOP_MOBILE_ROADMAP.md` – platformonkénti fejlesztés
- `V5_REARCHITECTURE_CHECKLIST.md` – aktuális végrehajtási checklist
- `V5_IMPLEMENTATION_STATUS.md` – részletes aktuális állapot
- `BETA1_KNOWN_ISSUES.md` – a kiadott Beta.1 ismert problémái


## Firmware-first dokumentáció

- `FIRMWARE_FIRST_EXECUTION_PLAN.md` – kötelező végrehajtási sorrend
- `../firmware/F14_0_FIRMWARE_AUDIT.md` – a `4.1.21` teljes auditja
- `../firmware/ARDUINO_DIRECT_API_V1_CONTRACT.md` – cél API-szerződés
- `../firmware/ARDUINO_EEPROM_LAYOUT_4_1_21.md` – jelenlegi és cél EEPROM-layout
- `../firmware/ARDUINO_SERIAL_COMMAND_CONTRACT.md` – USB Serial parancsok
- `../firmware/ARDUINO_HARDWARE_ACCEPTANCE_MATRIX.md` – hardveres kapu
- `../api/arduino-direct-api-v1.json` – OpenAPI 3.1 terv

A Tauri funkciófejlesztés az F14.4 hardveres firmware-kapuig szünetel.

## Release-dokumentáció

- `BETA1_RELEASE_NOTES.md`
- `BETA1_RELEASE_CHECKLIST.md`
- `BETA1_INSTALLATION_GUIDE.md`

A release-dokumentáció a kiadáskori állapot történeti lenyomata. Az új architektúradöntéseket az aktív dokumentáció tartalmazza.

## Történeti Alpha/API-v2 dokumentáció

Az Alpha.2, Alpha.3, LXC, API v2 és credential dokumentumok megőrzendő fejlesztési bizonyítékok. Nem jelentenek kötelező Node/LXC függést a végleges Tauri működésben.

## Elsődleges szabály

```text
Tauri / mobil -> közvetlen Arduino -> EEPROM schedule
```

Az opcionális Node/LXC szerver külön kísérleti vagy böngészős kiegészítés.
