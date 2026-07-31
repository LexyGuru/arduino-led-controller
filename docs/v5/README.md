# V5 dokumentációs index

## Aktív dokumentáció

- `V5_DIRECT_ARDUINO_ARCHITECTURE.md` – elsődleges rendszerfelépítés
- `V5_DIRECT_ARDUINO_SECURITY.md` – kulcsok, titkos profil és credential store
- `V5_DESKTOP_MOBILE_ROADMAP.md` – platformonkénti fejlesztés
- `V5_REARCHITECTURE_CHECKLIST.md` – aktuális végrehajtási checklist
- `V5_IMPLEMENTATION_STATUS.md` – részletes aktuális állapot
- `BETA1_KNOWN_ISSUES.md` – a kiadott Beta.1 ismert problémái

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
