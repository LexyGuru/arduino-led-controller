# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-29
Integrációs ág: `next/v5-rearchitecture`
Munkacsomag: `feature/v5-server-modularization`

## Repository és LXC

- [x] Stabil `main`, külön `next` és feature ág
- [x] Repository-validátor, titokellenőrzés és rollback
- [x] Alpha.2 izolált worktree release-gate
- [-] Alpha.2 gate valódi LXC-n
- [ ] Verziózott release-csomag telepítése

## Hitelesítés, API és megfigyelhetőség

- [x] Bearer és session hitelesítés
- [x] Szerepkörök, permissions, CSRF és user admin
- [x] OpenAPI 3.1, audit, metrics, Prometheus és diagnostics
- [x] Tartós EventStore és Socket.IO gateway
- [ ] Tokenrotációs admin API

## LED és Arduino

- [x] Közös sorba állított Arduino kliens
- [x] Közös LED szolgáltatás és legacy adapterek
- [x] Közös Arduino státuszmonitor
- [x] Legacy 30 másodperces státuszcron letiltása
- [x] Lapozott, TTL-alapú Arduino konzolcache
- [x] API v2 és legacy konzolvégpontok
- [ ] Arduino query API-kulcs lecserélése fejlécre

## Schedule

- [x] Arduino schedule service és EEPROM sync
- [x] Atomikus helyi schedule repository
- [x] Helyi schedule create/update/delete/import/export
- [x] Legacy helyi schedule adapter aktiválva
- [x] V5 schedule runner alapból aktív
- [x] Legacy percenkénti cron célzott letiltása
- [x] Percenkénti duplikációvédelem
- [x] Validált, atomikus schedule fájlkezelés
- [x] Legacy fájlfeltöltési hiba kiváltása közös szolgáltatással
- [ ] Arduino schedule upload endpoint hardveres igazolása
- [ ] `server2_legacy.js` helyi schedule kódjának fizikai törlése

## Firmware és OTA

- [x] Release, SHA-256, OTA és újraindulás-ellenőrzés
- [x] Legacy firmware adapter
- [ ] OTA megszakítás
- [ ] Utolsó működő firmware backup és rollback

## Web és szerver modularizáció

- [x] `public/` statikus fájlok külön Express installerben
- [x] Explicit HTTP és Socket.IO shutdown
- [x] Legacy signal handlerek elnyomása
- [x] Cron-cutover állapot API
- [-] Inline legacy dashboard kiváltása külön fájlokkal
- [ ] `server2_legacy.js` megszüntetése

## Desktop és mobil

- [ ] Tauri átállítása API v2-re
- [ ] OpenAPI-alapú TypeScript típusgenerálás
- [ ] Biztonságos token/session tárolás
- [ ] Realtime Socket.IO kliens és offline mód

## Kiadás

- [ ] Teljes izolált LXC integrációs és rollback teszt
- [ ] `5.0.0-alpha.2` verziólépés
- [ ] Staging telepítés
- [ ] Release notes és migrációs dokumentáció
- [ ] Beolvasztás `next`, majd `main` ágba

## Következő hatalmas munkacsomag

1. Valódi LXC alpha.2 gate és hibajavítás.
2. Verziószinkron `5.0.0-alpha.2`-re.
3. OpenAPI TypeScript kliens/típusgenerátor.
4. Inline legacy dashboard kiszervezése statikus fájlokba.
5. OTA backup és rollback alapok.
