# Arduino LED Controller 5.0.0-alpha.2

Kiadási ág: `feature/v5-server-modularization`

Minősített candidate commit:
`1236becc37e9b4d8ed2334f3cd60b455c248e82d`

Produkciós baseline a minősítés alatt:
`58e01b40e4568f5cd2648d370614077ef08aa1ba`

## Kiadási összefoglaló

Az Alpha.2 a V5 szervermodularizáció első teljes, izolált LXC-folyamaton
minősített előzetes kiadása. A candidate külön Git worktree-ben, külön staging
szolgáltatással és külön runtime könyvtárakkal futott. A minősítés nem váltotta
át és nem módosította a produkciós `main` checkoutot.

A staging szolgáltatás kizárólag a `127.0.0.1:3100` címen figyel, és az
izolált `127.0.0.1:65535` Arduino-célt használ. Nem örökli a produkciós Arduino API-kulcsot, OTA-jelszót
vagy a `10.0.0.123:80` hardvercélt.

## Backend és API

- moduláris API v2 platform és közös Express bootstrap;
- Bearer- és session-hitelesítés, CSRF-védelem, szerepkörök és user admin;
- forgatható, visszavonható, hash-elt API-token repository;
- LED-, schedule-, firmware-, konzol-, fájl- és rendszerüzemeltetési API;
- OpenAPI 3.1 szerződés és generált TypeScript kliens;
- auditnapló, metrikák, Prometheus, diagnostics és tartós eseménytár;
- maintenance mód, konfigurációs preflight, snapshot és idempotens migrációk;
- release-gate, promotion, execution receipt és finalization szolgáltatások.

## Arduino, LED és schedule

- közös sorba állított Arduino HTTP-kliens és egységes hibaleképezés;
- közös LED szolgáltatás API v2 és legacy adapterekkel;
- helyi schedule repository, runner, import/export és Arduino-szinkron;
- legacy schedule- és státuszcron célzott letiltása a V5 cutover alatt;
- Arduino konzolcache, fájlvalidáció és atomikus schedule fájlmentés.

## Firmware és OTA

- GitHub firmware release feldolgozás és SHA-256/digest ellenőrzés;
- shell nélküli OTA argumentumkezelés;
- firmware backup index, last-known-good védelem és rollback;
- OTA megszakítás és újraindulás-ellenőrzés.

## Desktop

- V5 szerver- és kiadási központ;
- Dashboard, LED, schedule, firmware és napló API v2 integráció;
- session/Bearer kapcsolatkezelés és natív credential bridge;
- online/offline/reconnecting állapotgép és offline olvasási cache;
- Socket.IO eseménykezelés polling fallbackkel;
- schedule konfliktuskezelés, firmware backup/rollback/cancel felület;
- release-gate, LXC orchestration és execution receipt panelek.

## Release és ellátásilánc-biztonság

- izolált candidate worktree release-gate;
- gépi, commitazonos és időkorlátos gate-jelentés;
- CycloneDX SBOM és determinisztikus provenance;
- release titokszivárgás-ellenőrzés redaktált diagnosztikával;
- verziózott staging/promotion bundle és SHA-256 ellenőrzés;
- staging deployment, rollback rehearsal és promotion receipt-lánc;
- artifact index és végrehajtási archívum;
- health-alapú automatikus staging rollback;
- produkciós guard, amely ellenőrzi a branch, commit, working tree, service és
  health változatlanságát.

## Alpha.2 minősítési eredmény

A rögzített LXC `gate-stage` futásban:

- a repository-validátor és a titokellenőrzés sikeres volt;
- az izolált endpoint- és rollbackteszt sikeres volt;
- a staging telepítés `ready` állapotot ért el;
- a szándékos health-hibás rollback-próba sikeres volt;
- a produkciós `main` commit és working tree változatlan maradt;
- a staging és rollback receipt, valamint az artifact archive elkészült;
- a `gate-stage` végén az orchestration állapot `awaiting-promotion` lett;
- a védett promotion után létrejött a promotion receipt és a
  `ready-for-finalization` állapot;
- a finalization jóváhagyás runtime evidence-ként, a repositoryn kívül kerül
  tárolásra.

## Ismert, Alpha.2 utánra maradó feladatok

- Arduino query API-kulcs áthelyezése HTTP fejlécbe;
- schedule upload endpoint hardveres igazolása;
- a megmaradt helyi schedule legacy kód fizikai eltávolítása;
- inline legacy dashboard teljes kiváltása;
- `server2_legacy.js` megszüntetése;
- a még nem migrált Tauri képernyők domain adapterre állítása;
- Multer 1.x kompatibilis, tesztelt frissítése 2.x-re.

## Verziószinkron

A következő fájlok egységesen `5.0.0-alpha.2` értéket tartalmaznak:

- `VERSION`;
- gyökér `package.json` és `package-lock.json`;
- `desktop-tauri/package.json` és `desktop-tauri/package-lock.json`;
- `desktop-tauri/src-tauri/Cargo.toml` és a projektcsomag a `Cargo.lock` fájlban;
- `desktop-tauri/src-tauri/tauri.conf.json`;
- `docs/api/openapi-v2.json`.
