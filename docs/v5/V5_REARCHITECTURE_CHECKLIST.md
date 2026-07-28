# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-28  
Integrációs ág: `next/v5-rearchitecture`  
Munkacsomag: `feature/v5-server-modularization`

## Jelmagyarázat

- `[x]` elkészült és tesztelt
- `[-]` folyamatban
- `[ ]` még nem kezdődött el

## Repository és LXC alapok

- [x] Stabil produkciós `main` ág
- [x] `next/v5-rearchitecture` integrációs ág
- [x] V5 verziószinkron és lockfile-ok
- [x] Baseline és repository-validátor
- [x] LXC függőség- és tulajdonosjavítás
- [x] Worktree frissítés előtti teszt
- [x] Systemd, live és ready ellenőrzés
- [ ] Automatikus rollback
- [ ] Verziózott release-csomag telepítése

## Health és API v2 platform

- [x] Live, ready és Arduino health
- [x] Egységes siker- és hibaválasz
- [x] Request ID és CORS/security
- [x] Bearer token
- [x] `admin`, `operator`, `viewer`
- [x] Jogosultsági middleware
- [x] Express bootstrap-regiszter
- [ ] Több API token és tokenrotáció
- [ ] OpenAPI gépi séma

## LED szolgáltatás

- [x] Sorba állított Arduino-kérések
- [x] LED validáció és RGB-formátumok
- [x] Közös LED szolgáltatás
- [x] API v2 LED olvasás, vezérlés és reset
- [x] LED jogosultságok és tesztek
- [ ] Legacy LED route-ok átállítása
- [ ] Közös Socket.IO LED eseménybusz

## Schedule szolgáltatás

- [x] Napindex- és hétköznap-validáció
- [x] HH:MM idővalidáció
- [x] Schedule-fájlnév validáció
- [x] LED-beállítások schedule-validációja
- [x] 27 bájtos EEPROM-rekord kódolás
- [x] Legfeljebb 60 bejegyzéses szinkron
- [x] Arduino schedule állapot és fájllista
- [x] Nap- és fájllekérdezés
- [x] Reload, generate, test és clear műveletek
- [x] API v2 schedule route-ok
- [x] Viewer/operator/admin schedule jogosultságok
- [x] Schedule szolgáltatás- és route-tesztek
- [ ] Helyi schedule repository kiemelése
- [ ] Legacy `localSchedules` memória egységesítése
- [ ] Szerveres időzítésfuttató külön modulba emelése
- [ ] Import/export API v2

## Szerver modularizálása

- [x] Legacy szerver elkülönítése
- [x] Core modulok és runtime context
- [x] Arduino kliens
- [x] LED szolgáltatás
- [x] Arduino schedule szolgáltatás
- [x] Moduláris API v2 platform
- [-] Legacy felhasználói hitelesítés
- [ ] Helyi schedule repository
- [ ] Firmware/OTA szolgáltatás
- [ ] Socket.IO modul
- [ ] Statikus webes felület
- [ ] `server2_legacy.js` megszüntetése

## Arduino firmware

- [ ] Firmware API-szerződés verziózása
- [ ] Query API-kulcs lecserélése fejlécre
- [ ] Egységes firmware hibakódok
- [ ] LED- és schedule-validáció firmware-oldalon
- [ ] OTA rollback stratégia

## Desktop és mobil

- [ ] Tauri átállítása API v2-re
- [ ] Közös TypeScript API-típusok
- [ ] Token biztonságos tárolása
- [ ] Offline mód és kapcsolati állapot
- [ ] Platformtesztek

## Kiadás

- [ ] `5.0.0-alpha.2`
- [ ] Teljes izolált LXC integrációs teszt
- [ ] Staging telepítés
- [ ] Migrációs és rollback dokumentáció
- [ ] Release notes
- [ ] Beolvasztás `main` ágba
- [ ] V5 produkciós kiadás

## Következő nagy munkacsomag

1. Helyi schedule repository és futtató kiemelése.
2. Legacy hitelesítési szolgáltatások.
3. Firmware/OTA szolgáltatás és API v2.
4. Teljes branch izolált LXC integrációs tesztje.
