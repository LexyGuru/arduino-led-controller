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
- [x] V5 verziószinkron, lockfile-ok és baseline
- [x] Repository-validátor és titokellenőrzés
- [x] Worktree alapú frissítés előtti ellenőrzés
- [x] Last-known-good commit és automatikus rollback
- [x] Rollback utáni dependency és health ellenőrzés
- [x] Alpha.2 izolált release-gate script
- [ ] Verziózott release-csomag telepítése

## Hitelesítés és felhasználók

- [x] Egy- és többtokenes Bearer auth
- [x] `admin`, `operator`, `viewer`
- [x] Legacy-kompatibilis session
- [x] Session vagy Bearer az API v2-n
- [x] Stateless session CSRF
- [x] Felhasználólista és létrehozás
- [x] Szerepkör, név és engedélyezettség módosítása
- [x] Jelszócsere és session invalidálás
- [x] Felhasználótörlés
- [x] Utolsó aktív admin védelme
- [x] Felhasználói auditnapló
- [ ] Tokenrotációs admin API
- [ ] Legacy auth route-ok átállítása

## Realtime, események és audit

- [x] Memóriabeli EventBus
- [x] Socket.IO V5 gateway
- [x] Korlátozott memóriatörténet
- [x] Tartós JSONL EventStore
- [x] Téma szerinti tartós lekérdezés
- [x] Méretalapú eseményrotáció
- [x] Redaktált auditnapló
- [x] Audit status és recent API
- [ ] Legacy Socket.IO események teljes átállítása

## Megfigyelhetőség és életciklus

- [x] HTTP request számlálók és időmérés
- [x] Eseménymetrikák
- [x] Metrics API
- [x] Részletes diagnostics API
- [x] Starting/ready/draining/stopped életciklus
- [x] Draining-aware readiness
- [x] SIGTERM/SIGINT cleanup
- [ ] HTTP szerverpéldány explicit close
- [ ] Prometheus szöveges export

## LED és schedule

- [x] Közös Arduino és LED szolgáltatás
- [x] API v2 LED route-ok
- [x] Arduino schedule és EEPROM sync
- [x] Atomikus helyi schedule repository
- [x] Helyi schedule create/delete/import/export
- [x] Helyi schedule update
- [x] Időzónahelyes V5 runner
- [ ] Legacy LED route-ok átállítása
- [ ] Legacy `localSchedules` memória kiváltása
- [ ] Legacy cron kikapcsolása

## Firmware

- [x] GitHub release és SHA-256 ellenőrzés
- [x] Biztonságos OTA folyamat
- [x] API v2 firmware route-ok
- [ ] OTA megszakítás
- [ ] Utolsó működő firmware backup
- [ ] Firmware rollback
- [ ] Legacy firmware route-ok átállítása

## API dokumentáció

- [x] OpenAPI 3.1 dokumentum
- [x] 45 dokumentált útvonal
- [x] Bearer, session és CSRF sémák
- [x] JSON dokumentum végpont
- [x] Egyszerű HTML dokumentáció
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

1. Izolált LXC release gate és rollback-próba futtatása.
2. Legacy route-adapterek a közös szolgáltatásokhoz.
3. Explicit HTTP és Socket.IO szerverleállítás.
4. `5.0.0-alpha.2` verziólépés és release notes.
