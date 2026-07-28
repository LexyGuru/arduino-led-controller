# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-28  
Integrációs ág: `next/v5-rearchitecture`  
Munkacsomag: `feature/v5-server-modularization`

## Jelmagyarázat

- `[x]` elkészült és tesztelt
- `[-]` folyamatban
- `[ ]` még nem kezdődött el

## Repository és kiadási alapok

- [x] Stabil produkciós `main` ág megőrzése
- [x] `next/v5-rearchitecture` integrációs ág
- [x] Feature branch alapú fejlesztés
- [x] V5 verziószinkron: `5.0.0-alpha.1`
- [x] Lockfile-ok, `.editorconfig`, baseline
- [x] Verzióellenőrző és repository-validátor
- [x] Titkos fájlok Git-ellenőrzése

## LXC futtatás és frissítés

- [x] Függőségtulajdonos-ellenőrzés és javítás
- [x] `npm ci` helyes alkalmazáskönyvtárból
- [x] Külön worktree frissítés előtti teszt
- [x] Systemd, live és ready ellenőrzés
- [ ] Automatikus rollback
- [ ] Verziózott release-csomag telepítése

## Health és API v2 platform

- [x] Live, ready és Arduino health
- [x] Egységes API v2 siker- és hibaválasz
- [x] Request ID és CORS/security
- [x] Bearer token hitelesítés
- [x] `admin`, `operator`, `viewer` szerepkör
- [x] Központi jogosultsági modell
- [x] Külön permission middleware
- [x] Rendszer- és Arduino-státusz végpontok
- [x] Express bootstrap-regiszter
- [x] API middleware-ek, route-ok és hibakezelés külön modulban
- [ ] Több külön API token és tokenrotáció
- [ ] OpenAPI gépi séma

## LED szolgáltatás és API

- [x] Sorba állított Arduino HTTP-kérések
- [x] LED azonosító-validáció
- [x] Fényerő-, effekt- és sebességvalidáció
- [x] RGB tömb, objektum és hex szín
- [x] Közös LED szolgáltatás
- [x] `GET /api/v2/leds`
- [x] `GET /api/v2/leds/:id`
- [x] `PUT /api/v2/leds/:id`
- [x] `POST /api/v2/leds/actions/all-on`
- [x] `POST /api/v2/leds/actions/all-off`
- [x] `POST /api/v2/leds/actions/reset`
- [x] Viewer/operator/admin jogosultságok
- [x] LED szolgáltatás és route smoke tesztek
- [ ] Legacy LED route-ok átállítása a közös szolgáltatásra
- [ ] Socket.IO LED események közös eseménybuszon

## Szerver modularizálása

- [x] Legacy szerver elkülönítése
- [x] Rövid V5 indítófájl
- [x] Core konfiguráció, útvonalak, logger, runtime context
- [x] Arduino kliens és egységes hibák
- [x] LED szolgáltatás és validáció
- [x] API v2 moduláris platform
- [-] Legacy felhasználói hitelesítés kiemelése
- [ ] Schedule szolgáltatás
- [ ] Firmware/OTA szolgáltatás
- [ ] Socket.IO modul
- [ ] Statikus webes felület
- [ ] `server2_legacy.js` megszüntetése

## Arduino firmware

- [ ] Firmware API-szerződés verziózása
- [ ] Query API-kulcs lecserélése fejléces hitelesítésre
- [ ] Egységes firmware hibakódok
- [ ] LED- és schedule-parancsok firmware-validációja
- [ ] OTA visszaállítási stratégia

## Desktop és mobil kliens

- [ ] Tauri átállítása API v2-re
- [ ] Közös TypeScript API-típusok
- [ ] Token biztonságos tárolása
- [ ] Offline és kapcsolati állapot
- [ ] macOS, Windows, Linux, iOS és Android tesztek

## Kiadás

- [ ] `5.0.0-alpha.2`
- [ ] Teljes izolált LXC integrációs teszt
- [ ] Staging telepítés
- [ ] Migrációs és rollback dokumentáció
- [ ] Release notes
- [ ] Beolvasztás `main` ágba
- [ ] V5 produkciós kiadás

## Következő nagy munkacsomag

1. Legacy felhasználói hitelesítés külön szolgáltatásba.
2. Schedule adattár, validáció és API v2 végpontok.
3. Legacy LED route-ok átállítása az új LED szolgáltatásra.
4. Teljes branch izolált LXC integrációs tesztje.
