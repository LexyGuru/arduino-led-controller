# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-29
Integrációs ág: `next/v5-rearchitecture`
Munkacsomag: `feature/v5-server-modularization`

## Repository és LXC

- [x] Stabil `main`, külön `next` és feature ág
- [x] Repository-validátor, titokellenőrzés és rollback
- [x] Alpha.2 izolált worktree release-gate
- [-] Alpha.2 gate valódi LXC-n
- [-] Verziózott release bundle készítés és ellenőrzés

## Hitelesítés, API és megfigyelhetőség

- [x] Bearer és session hitelesítés
- [x] Szerepkörök, permissions, CSRF és user admin
- [x] OpenAPI 3.1, audit, metrics, Prometheus és diagnostics
- [x] Tartós EventStore és Socket.IO gateway
- [x] Tokenrotációs admin API és hash-elt token repository

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
- [x] OTA megszakítás
- [x] Utolsó működő firmware backup és rollback

## Web és szerver modularizáció

- [x] `public/` statikus fájlok külön Express installerben
- [x] Explicit HTTP és Socket.IO shutdown
- [x] Legacy signal handlerek elnyomása
- [x] Cron-cutover állapot API
- [-] Inline legacy dashboard kiváltása külön fájlokkal
- [ ] `server2_legacy.js` megszüntetése

## Desktop és mobil

- [-] Tauri képernyők fokozatos átállítása API v2-re
- [x] OpenAPI-alapú TypeScript típus- és kliensgenerálás
- [x] Session-cookie elsődleges hitelesítés
- [x] Bearer token alapból csak folyamatmemóriában
- [x] Natív Tauri credential bridge és memóriás fallback
- [x] Szerverprofil és URL-biztonsági validáció
- [x] Online/offline/reconnecting állapotgép
- [x] Offline olvasási cache és veszélyes írások tiltása
- [x] Socket.IO factory és polling realtime fallback
- [x] LED, schedule, firmware és system domain adapterek
- [x] React provider és állapothook
- [x] Rust credential parancsok macOS, Windows és Linux kulcstárhoz
- [-] Meglévő Tauri képernyők domain adapterekre állítása
  - [x] V5 rendszer- és kiadási központ
  - [x] Session/Bearer kapcsolatkezelő felület
  - [x] Release és konfigurációs preflight
  - [x] Maintenance, snapshot és migráció kezelése
  - [x] Dashboard API v2 státusz, cache és közvetlen fallback
  - [x] LED API v2 vezérlés, realtime és biztonságos fallback
  - [x] Schedule API v2 szerkesztés, konfliktuskezelés és Arduino-szinkron
  - [x] Firmware API v2 update, cancel, backup és rollback képernyő

## Rendszerüzemeltetés

- [x] Tartós karbantartási mód
- [x] Módosító API-k maintenance blokkolása
- [x] Konfigurációs és könyvtár-preflight
- [x] Verziózott rendszer-snapshot
- [x] Fájlonkénti snapshot SHA-256 ellenőrzés
- [x] Maintenance-köteles snapshot restore
- [x] Idempotens migrációs futtató és dry-run
- [x] Release metadata és OpenAPI hash API
- [x] Staging preflight/snapshot/health telepítő

## Kiadás


- [ ] Teljes izolált LXC integrációs és rollback teszt
- [ ] `5.0.0-alpha.2` verziólépés
- [ ] Staging telepítés
- [ ] Release notes és migrációs dokumentáció
- [ ] Beolvasztás `next`, majd `main` ágba

## Alpha.2 release-gate és staging

- [x] Candidate commitot ellenőrző gépi gate jelentés
- [x] Gate kor- és commitvalidáció
- [x] Preflight, migration és maintenance promóciós readiness
- [x] Atomikus promóciós jóváhagyás és visszavonás
- [x] V5 desktop release-gate panel
- [x] Izolált candidate worktree runner
- [x] Verziózott staging telepítő
- [x] Health-alapú automatikus rollback
- [x] Külön kézi rollback eszköz
- [x] Hardened staging systemd unit
- [ ] Valódi LXC gate futtatása
- [ ] Közvetlen `5.0.0-alpha.2` verziószinkron

## Következő hatalmas munkacsomag

1. Valódi LXC `gate-stage` futtatása.
2. Promotion approval és védett `promote` futtatása.
3. `ready-for-finalization` állapot ellenőrzése.
4. `FINALIZE_ALPHA2_VERSION_SYNC` jóváhagyás.
5. Teljes `5.0.0-alpha.2` verziószinkron.
