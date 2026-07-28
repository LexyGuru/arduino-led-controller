# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-28
Integrációs ág: `next/v5-rearchitecture`
Munkacsomag: `feature/v5-server-modularization`

## Jelmagyarázat

- `[x]` elkészült és tesztelt
- `[-]` folyamatban
- `[ ]` még nem kezdődött el

## Repository és LXC

- [x] Stabil `main` és külön `next` ág
- [x] V5 verziószinkron, lockfile-ok és baseline
- [x] Repository-validátor és titokellenőrzés
- [x] LXC dependency javítás és worktree teszt
- [x] Systemd, live és ready ellenőrzés
- [ ] Automatikus rollback
- [ ] Verziózott release-csomag telepítése

## Hitelesítés és jogosultság

- [x] Egyetlen Bearer token kompatibilitás
- [x] Többtokenes `API_V2_TOKENS_JSON`
- [x] Tokenazonosító és külön szerepkör
- [x] `admin`, `operator`, `viewer`
- [x] Permission middleware
- [ ] Legacy felhasználói repository kiemelése
- [ ] Legacy session szolgáltatás kiemelése
- [ ] API v2 felhasználó-adminisztráció
- [ ] Tokenrotációs admin API
- [ ] CSRF modul kiemelése

## LED

- [x] Közös Arduino kliens és request queue
- [x] LED validáció és szolgáltatás
- [x] API v2 LED route-ok és jogosultságok
- [ ] Legacy LED route-ok átállítása
- [ ] Socket.IO LED eseménybusz

## Arduino schedule

- [x] Validáció és 27 bájtos EEPROM-kódolás
- [x] Arduino schedule service
- [x] API v2 Arduino schedule route-ok
- [x] EEPROM sync és jogosultságok

## Helyi schedule

- [x] Külön `weekly-led-schedules-v5.json` repository
- [x] Atomikus JSON repository
- [x] Import előtti automatikus backup
- [x] Többnapos létrehozás
- [x] Export/import API v2
- [x] Arduino EEPROM sync
- [x] Időzónahelyes V5 runner
- [x] Percenkénti duplikációvédelem
- [x] Manuális runner tick
- [-] Automatikus runner aktiválása
- [ ] Legacy `localSchedules` memória kiváltása
- [ ] Legacy cron kikapcsolása
- [ ] Helyi schedule update végpont

## Firmware és OTA

- [x] GitHub release metadata
- [x] Bináris és checksum asset kiválasztása
- [x] SHA-256 és GitHub digest ellenőrzés
- [x] Firmware méretkorlát
- [x] Biztonságos OTA folyamatindítás
- [x] OTA állapotgép
- [x] Arduino visszajelentkezés ellenőrzése
- [x] API v2 status/check/update
- [x] Firmware jogosultságok
- [ ] OTA megszakítás
- [ ] Utolsó működő firmware backup
- [ ] Firmware rollback
- [ ] Legacy firmware route-ok átállítása

## Szerver modularizálása

- [x] Core és runtime context
- [x] Arduino, LED és schedule szolgáltatások
- [x] Helyi schedule repository és runner
- [x] Többtokenes API-hitelesítés
- [x] Firmware/OTA szolgáltatás
- [x] Moduláris API v2 platform
- [-] Legacy route-ok migrációja
- [ ] Socket.IO modul
- [ ] Statikus webes felület
- [ ] `server2_legacy.js` megszüntetése

## Firmware-oldali fejlesztések

- [ ] Firmware API-szerződés verziózása
- [ ] Query API-kulcs lecserélése fejlécre
- [ ] Egységes firmware hibakódok
- [ ] Firmware-oldali LED/schedule validáció
- [ ] OTA rollback támogatás

## Desktop és mobil

- [ ] Tauri átállítása API v2-re
- [ ] Közös TypeScript típusok
- [ ] Token biztonságos tárolása
- [ ] Offline mód
- [ ] Platformtesztek

## Kiadás

- [ ] `5.0.0-alpha.2`
- [ ] Teljes izolált LXC integrációs teszt
- [ ] Staging telepítés
- [ ] Migrációs és rollback dokumentáció
- [ ] Release notes
- [ ] Beolvasztás `main` ágba
- [ ] V5 produkciós kiadás

## Következő hatalmas munkacsomag

1. Legacy LED, schedule, auth és firmware route-adapterek.
2. Közös eseménybusz és Socket.IO modul.
3. Automatikus LXC rollback.
4. Teljes izolált LXC integrációs teszt és `5.0.0-alpha.2`.
