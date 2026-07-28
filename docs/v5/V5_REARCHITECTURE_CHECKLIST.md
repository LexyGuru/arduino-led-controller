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
- [x] Könyvtár- és konfigurációellenőrzés
- [x] Arduino offline állapot kezelése
- [x] Központi runtime context használata
- [x] Megosztott Arduino-kliens használata
- [x] Duplikált Axios- és Arduino URL-kód eltávolítása
- [x] Mac és izolált LXC smoke teszt

## API v2 alapok

- [x] API v2 szerződés
- [x] Egységes sikeres és hibaválasz
- [x] Request ID és CORS
- [x] Bearer token hitelesítés
- [x] `GET /api/v2`
- [x] `GET /api/v2/system/health`
- [x] `GET /api/v2/system/status`
- [x] `GET /api/v2/arduino/status`
- [x] Központi runtime context használata
- [x] Megosztott Arduino-kliens használata
- [x] Arduino klienshibák HTTP-hibává alakítása
- [x] Duplikált konfiguráció- és Axios-kód eltávolítása
- [x] Régi `/api/...` kompatibilitás
- [ ] API v2 LED vezérlési végpontok
- [ ] API v2 naptárvégpontok
- [ ] API v2 firmware-végpontok
- [ ] OpenAPI gépi séma

## Szerver modularizálása

- [x] Legacy szerver elkülönítése
- [x] Rövid V5 indítófájl
- [x] Futásidejű útvonalmodul
- [x] Központi konfigurációs modul
- [x] Központi logger factory
- [x] Központi runtime context
- [x] Megosztott Arduino HTTP-kliens
- [x] Egységes Arduino klienshibák
- [x] Health átállítása a megosztott kliensre
- [x] API v2 átállítása a megosztott kliensre
- [x] Duplikált Arduino-kapcsolati kód eltávolítása
- [-] Hitelesítési modul kiemelése
- [ ] Express alkalmazás factory kiemelése
- [ ] Socket.IO modul kiemelése
- [ ] Schedule szolgáltatás kiemelése
- [ ] Firmware/OTA szolgáltatás kiemelése
- [ ] LED vezérlési szolgáltatás kiemelése
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

## Következő közvetlen lépések

1. API v2 Bearer-hitelesítés külön modulba emelése.
2. CORS és security middleware külön modulba emelése.
3. Express alkalmazás factory előkészítése.
4. A modularizációs munkacsomag izolált LXC-tesztje.
