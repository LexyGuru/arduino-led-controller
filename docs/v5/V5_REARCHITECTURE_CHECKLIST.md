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
- [x] Gyökér és Tauri lockfile-ok
- [x] `.editorconfig`
- [x] Baseline dokumentáció
- [x] Verzióellenőrző
- [x] Repository-validátor
- [x] Titkos fájlok Git-ellenőrzése

## LXC futtatás és frissítés

- [x] Node-függőségek tulajdonosának ellenőrzése
- [x] Hibás/root tulajdonú `node_modules` javítása
- [x] `npm ci` helyes alkalmazáskönyvtárból fut
- [x] Frissítés előtti külön worktree ellenőrzés
- [x] Systemd szolgáltatásellenőrzés
- [x] HTTP live és ready ellenőrzés
- [ ] Automatikus rollback sikertelen frissítés után
- [ ] Verziózott release-csomag telepítése Git pull helyett

## Health rendszer

- [x] `GET /health/live`
- [x] `GET /health/ready`
- [x] `GET /health/arduino`
- [x] Központi runtime context
- [x] Megosztott Arduino-kliens
- [x] Duplikált Axios- és Arduino URL-kód eltávolítása
- [x] Közös Express bootstrap-regiszter használata
- [x] Mac és izolált LXC smoke teszt

## API v2 alapok

- [x] API v2 szerződés
- [x] Egységes sikeres és hibaválasz
- [x] Request ID
- [x] Bearer token hitelesítés
- [x] CORS és security headerek
- [x] `GET /api/v2`
- [x] `GET /api/v2/system/health`
- [x] `GET /api/v2/system/status`
- [x] `GET /api/v2/arduino/status`
- [x] Központi runtime context
- [x] Megosztott Arduino-kliens
- [x] Auth külön modulban
- [x] CORS/security külön modulban
- [x] Readiness külön modulban
- [x] Route kezelők külön modulban
- [x] Hibakezelés külön modulban
- [x] Arduino hibaleképezés külön modulban
- [x] Régi `/api/...` kompatibilitás
- [ ] API v2 LED vezérlési végpontok
- [ ] API v2 naptárvégpontok
- [ ] API v2 firmware-végpontok
- [ ] OpenAPI gépi séma

## Szerver modularizálása

- [x] Legacy szerver elkülönítése
- [x] Rövid V5 indítófájl
- [x] Futásidejű útvonalmodul
- [x] Központi konfiguráció
- [x] Központi logger factory
- [x] Központi runtime context
- [x] Megosztott Arduino HTTP-kliens
- [x] Egységes Arduino klienshibák
- [x] Közös Express bootstrap-regiszter
- [x] Health külön route installer
- [x] API v2 külön route installer
- [x] API v2 middleware-ek és route-ok szétválasztása
- [-] Legacy hitelesítési modul kiemelése
- [ ] LED szolgáltatás kiemelése
- [ ] Schedule szolgáltatás kiemelése
- [ ] Firmware/OTA szolgáltatás kiemelése
- [ ] Socket.IO modul kiemelése
- [ ] Statikus webes felület kiemelése
- [ ] `server2_legacy.js` megszüntetése

## Arduino firmware

- [ ] Firmware API-szerződés verziózása
- [ ] Query API-kulcs lecserélése fejléces hitelesítésre
- [ ] Egységes firmware hibakódok
- [ ] Állapotválasz sémájának rögzítése
- [ ] LED- és schedule-parancsok validációja
- [ ] OTA visszaállítási stratégia

## Desktop és mobil kliens

- [ ] Tauri kliens átállítása API v2-re
- [ ] Közös TypeScript API-típusok
- [ ] Token biztonságos tárolása
- [ ] Kapcsolati állapot és offline mód
- [ ] macOS, Windows és Linux teszt
- [ ] iOS és Android teszt

## Kiadás

- [ ] `5.0.0-alpha.2`
- [ ] Teljes izolált LXC integrációs teszt
- [ ] Staging telepítés
- [ ] Migrációs és visszaállítási dokumentáció
- [ ] Release notes
- [ ] Beolvasztás a `main` ágba
- [ ] V5 produkciós kiadás

## Következő nagyobb munkacsomag

1. Legacy felhasználói hitelesítés kiemelése.
2. LED szolgáltatás és API v2 LED route-ok.
3. Schedule szolgáltatás alapjainak kiemelése.
4. A teljes modularizációs branch izolált LXC-tesztje.
