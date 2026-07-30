# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-30
Integrációs ág: `next/v5-rearchitecture`
Munkacsomag: `feature/v5-alpha3-device-key-header`
Minősített Alpha.2 candidate: `1236becc37e9b4d8ed2334f3cd60b455c248e82d`
Alpha.2 `next` merge commit: `bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b`

## Repository és LXC

- [x] Stabil `main`, külön `next` és feature ág
- [x] Repository-validátor, titokellenőrzés és rollback
- [x] Alpha.2 izolált worktree release-gate
- [x] Alpha.2 gate valódi LXC-n
- [x] Verziózott release bundle készítés és ellenőrzés
- [x] Izolált staging service és loopback-only hálózati kötés
- [x] Staging Arduino-cél leválasztva a produkciós hardverről

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
- [-] Arduino query API-kulcs lecserélése `X-Device-Key` fejlécre
  - [x] moduláris Node kliens
  - [x] legacy Node és macOS curl transport
  - [x] Tauri közvetlen Arduino kliens
  - [x] firmware header-first auth és kikapcsolható query fallback
  - [ ] valódi UNO R4 WiFi hardverteszt és fallback-off bizonyítás

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
- [-] Firmware `4.1.21` `X-Device-Key` migráció automatizált tesztekkel
- [ ] Firmware `4.1.21` valódi hardverteszt és rollback-próba

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

- [x] Teljes izolált LXC integrációs és rollback teszt
- [x] Staging telepítés és readiness
- [x] Promotion és teljes execution receipt-lánc
- [x] `FINALIZE_ALPHA2_VERSION_SYNC` jóváhagyás
- [x] `5.0.0-alpha.2` verziólépés
- [x] Release notes és migrációs dokumentáció
- [x] Beolvasztás `next/v5-rearchitecture` ágba (`PR #1`, `bd5cb67`)
- [x] Új integrációs ellenőrzés a `next` ágon
- [ ] Beolvasztás `main` ágba
- [ ] Produkciós telepítés külön jóváhagyással

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
- [x] Valódi LXC gate futtatása
- [x] Staging deployment receipt
- [x] Rollback rehearsal receipt
- [x] Promotion deployment receipt
- [x] Receipt SHA-256 előzménylánc
- [x] Artifact index és execution archive
- [x] Közvetlen `5.0.0-alpha.2` verziószinkron

## Dokumentáció és integrációs előkészítés

- [x] A master roadmap aktuális státuszszekcióval kiegészítve
- [x] Részletes V5 implementációs állapotjelentés
- [x] Biztonságos feature → `next` integrációs runbook
- [x] Alpha.2 integrációs readiness ellenőrző
- [x] Dokumentációs és package-manifest tesztek
- [x] A finalizáló/integrációs csomag commitja és push-a
- [x] Pull Request a `next/v5-rearchitecture` ágba (`#1`)
- [x] PR #1 whitespace- és státuszgate lezárása
- [x] Teljes integrációs teszt a `next` ágon

## Alpha.3 eszközkulcs-fejléc munkacsomag

- [x] `X-Device-Key` szerződés a moduláris Node kliensben
- [x] case-insensitive kliensoldali fejléc-felülírás elleni védelem
- [x] legacy Node és macOS curl fejlécmigráció
- [x] macOS curl secret átadása stdinről, process-argumentum nélkül
- [x] Tauri közvetlen Arduino kliens fejlécmigráció
- [x] firmware `4.1.21` header-first auth
- [x] duplikált és hibás fejléc tiltási logika
- [x] mérhető, compile-time kikapcsolható query fallback
- [x] Alpha.3 automatizált szerződés- és manifestteszt
- [x] rollout-, rollback- és hardverteszt-dokumentáció
- [ ] Arduino CLI firmware build GitHub Actionsben
- [ ] valódi UNO R4 WiFi fejléc- és negatív teszt
- [ ] staging gateway és Tauri hardverteszt
- [ ] fallback-off firmware-próba
- [ ] új Alpha.3 gate–staging–rollback evidence
- [ ] `5.0.0-alpha.3` finalization

## Következő munkacsomag

1. Az Alpha.3 feature ág létrehozása a `bd5cb67` `next` commitból.
2. A teljes Alpha.3 csomag tesztelése és push-a.
3. GitHub Actions firmware `4.1.21` fordítás ellenőrzése.
4. Firmware-first hardverteszt `API_ALLOW_QUERY_KEY_FALLBACK=1` állapotban.
5. Staging Node/Tauri fejléc-hitelesítés és napló-redakció igazolása.
6. Külön fallback-off firmware build és rollback-próba.
7. Új gate–staging–rollback evidence, majd csak később Alpha.3 finalization.
8. A `main` ág változatlan marad külön release-jóváhagyásig.
