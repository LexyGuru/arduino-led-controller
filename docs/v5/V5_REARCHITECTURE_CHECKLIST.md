# V5 újraarchitektúra – állapot-checklist

Utolsó frissítés: 2026-07-29
Integrációs ág: `next/v5-rearchitecture`
Munkacsomag: `feature/v5-server-modularization`

## Jelmagyarázat

- `[x]` elkészült és tesztelt
- `[-]` folyamatban
- `[ ]` még nem kezdődött el

## Repository és LXC

- [x] Stabil `main` és külön `next` ág
- [x] V5 verziószinkron, baseline és repository-validátor
- [x] Worktree alapú frissítés előtti teszt
- [x] Last-known-good commit és automatikus rollback
- [x] Rollback utáni dependency és health ellenőrzés
- [x] Alpha.2 izolált release-gate script
- [ ] Verziózott release-csomag telepítése

## Hitelesítés és legacy kompatibilitás

- [x] Bearer és session auth az API v2-n
- [x] Session CSRF és felhasználó-adminisztráció
- [x] Legacy auth status/login/logout adapter
- [x] Legacy `/api` session middleware a közös SessionService alapján
- [-] Legacy setup és user-admin route-ok teljes átállítása
- [ ] Tokenrotációs admin API

## Realtime és életciklus

- [x] EventBus, EventStore és Socket.IO V5 gateway
- [x] Legacy Socket.IO eseménynév-híd
- [x] SIGTERM/SIGINT cleanup coordinator
- [x] Legacy saját signal handlerek elnyomása
- [x] HTTP/HTTPS szerverpéldány-regiszter
- [x] Explicit HTTP szerver close
- [x] Explicit Socket.IO close
- [ ] Legacy 30 másodperces státusz-cron kiváltása

## Megfigyelhetőség

- [x] HTTP és eseménymetrikák
- [x] Metrics és diagnostics API
- [x] Prometheus 0.0.4 szöveges export
- [x] Tartós eseménytár és rotálható auditnapló

## Arduino, LED és beállítások

- [x] Közös ArduinoClient request queue
- [x] Futás közben módosítható Arduino target
- [x] Atomikus `server-settings.json` mentés
- [x] OTA célcím együtt frissül
- [x] API v2 settings route
- [x] Legacy settings adapter
- [x] Legacy Arduino read route-ok átállítása
- [x] Legacy LED update/all-on/all-off/reset átállítása
- [ ] Legacy Arduino konzolcache külön modulba emelése
- [ ] Legacy schedule fájlfeltöltés külön modulba emelése

## Schedule

- [x] Arduino schedule service és EEPROM sync
- [x] Helyi schedule repository és V5 runner
- [x] Legacy Arduino schedule route-ok átállítása
- [x] Legacy helyi schedule adapter elkészült
- [-] Legacy helyi schedule adapter aktiválása
- [ ] Legacy `localSchedules` memória kiváltása
- [ ] Legacy percenkénti cron kikapcsolása

## Firmware

- [x] GitHub release és SHA-256 ellenőrzés
- [x] Biztonságos OTA folyamat és API v2 route-ok
- [x] Legacy firmware status/update adapter
- [ ] OTA megszakítás
- [ ] Utolsó működő firmware backup
- [ ] Firmware rollback

## API dokumentáció

- [x] OpenAPI 3.1 dokumentum
- [x] Prometheus végpont dokumentálása
- [x] Runtime Arduino settings dokumentálása
- [ ] Automatikus TypeScript kliensgenerálás

## Kiadás

- [-] Teljes izolált LXC integrációs teszt
- [-] Staging telepítés és rollback-próba
- [ ] `5.0.0-alpha.2`
- [ ] Migrációs és rollback dokumentáció
- [ ] Release notes
- [ ] Beolvasztás `main` ágba
- [ ] V5 produkciós kiadás

## Következő hatalmas munkacsomag

1. Legacy helyi schedule memória és cron kiváltása.
2. Arduino konzolcache és fájlkezelés modularizálása.
3. Izolált LXC release gate és rollback-próba.
4. `5.0.0-alpha.2` verziólépés.
