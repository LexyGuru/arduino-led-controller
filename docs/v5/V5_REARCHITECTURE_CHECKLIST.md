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
- [x] Last-known-good commit tárolás
- [x] Sikertelen telepítés automatikus Git rollbackje
- [x] Rollback utáni dependency-javítás és health ellenőrzés
- [ ] Verziózott release-csomag telepítése

## Hitelesítés és jogosultság

- [x] Egy- és többtokenes Bearer hitelesítés
- [x] `admin`, `operator`, `viewer`
- [x] Permission middleware
- [x] Legacy `users.json` repository
- [x] Scrypt jelszóellenőrzés
- [x] Legacy-kompatibilis `led_session`
- [x] API v2 auth status/login/logout
- [x] Védett API v2: Bearer vagy session
- [x] Login/logout események
- [ ] API v2 felhasználó-adminisztráció
- [ ] Tokenrotációs admin API
- [ ] CSRF modul kiemelése

## Realtime és eseménybusz

- [x] Közös memóriabeli EventBus
- [x] Korlátozott eseménytörténet
- [x] Téma szerinti előfizetés
- [x] Közös Socket.IO bootstrap-regiszter
- [x] V5 `v5:ready` és `v5:event`
- [x] Kliens által kérhető eseménytörténet
- [x] API v2 event status és recent
- [x] LED-, schedule-, firmware- és auth-események
- [ ] Legacy Socket.IO események teljes átállítása
- [ ] Tartós eseménytár

## LED

- [x] Közös Arduino kliens és request queue
- [x] LED validáció és szolgáltatás
- [x] API v2 LED route-ok és jogosultságok
- [x] LED szolgáltatásesemények
- [ ] Legacy LED route-ok átállítása

## Schedule

- [x] Arduino schedule validáció és EEPROM-kódolás
- [x] Arduino schedule API v2
- [x] Atomikus helyi schedule repository és backup
- [x] Időzónahelyes V5 runner
- [x] Schedule események
- [-] Automatikus runner aktiválása
- [ ] Legacy `localSchedules` memória kiváltása
- [ ] Legacy cron kikapcsolása
- [ ] Helyi schedule update végpont

## Firmware és OTA

- [x] GitHub release és SHA-256 ellenőrzés
- [x] Biztonságos OTA folyamatindítás
- [x] OTA állapotgép és Arduino visszajelentkezés
- [x] API v2 status/check/update
- [x] Firmware állapotesemények
- [ ] OTA megszakítás
- [ ] Utolsó működő firmware backup
- [ ] Firmware rollback
- [ ] Legacy firmware route-ok átállítása

## Szerver modularizálása

- [x] Core és runtime context
- [x] Biztonsági és session szolgáltatások
- [x] EventBus és Socket.IO gateway
- [x] Arduino, LED, schedule és firmware szolgáltatások
- [x] Moduláris API v2 platform
- [-] Legacy route-ok migrációja
- [ ] Statikus webes felület
- [ ] `server2_legacy.js` megszüntetése

## Desktop és mobil

- [ ] Tauri átállítása API v2-re
- [ ] Közös TypeScript típusok
- [ ] Token/session biztonságos tárolása
- [ ] Realtime Socket.IO kliens
- [ ] Offline mód
- [ ] Platformtesztek

## Kiadás

- [ ] `5.0.0-alpha.2`
- [ ] Teljes izolált LXC integrációs teszt
- [ ] Staging telepítés és rollback-próba
- [ ] Migrációs és rollback dokumentáció
- [ ] Release notes
- [ ] Beolvasztás `main` ágba
- [ ] V5 produkciós kiadás

## Következő hatalmas munkacsomag

1. Legacy LED, schedule, auth és firmware route-adapterek.
2. Legacy Socket.IO események bekötése a közös EventBus rendszerbe.
3. OpenAPI 3.1 séma és API v2 JSON Schema.
4. Teljes izolált LXC integrációs és rollback teszt.
5. `5.0.0-alpha.2` verziólépés.
