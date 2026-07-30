# V5 Alpha.2 integráció a `next/v5-rearchitecture` ágba

## Cél

A `feature/v5-server-modularization` Alpha.2 munkacsomag biztonságos
beolvasztása a közös `next/v5-rearchitecture` integrációs ágba úgy, hogy:

- a `main` ág változatlan maradjon;
- a produkciós LXC ne váltson ágat;
- a `10.0.0.123:80` Arduino ne kapjon staging vagy integrációs parancsot;
- merge-konfliktus vagy teszthiba esetén az integráció egyszerűen eldobható legyen;
- a feature ág teljes története és bizonyítékai megmaradjanak.


## Aktuális végrehajtási állapot – 2026-07-30

- integrációs ág létrejött és felkerült az originre;
- Pull Request `#1` nyitva van a `next/v5-rearchitecture` célággal;
- a PR 432 fájlt tartalmaz;
- a GitHub lapozott API-lista és a helyi Git diff fájllistája egyezik;
- a teljes repository-validáció sikeres;
- a merge előtt a `git diff --check` által jelzett EOF-üres sorokat és a
  generátor regresszióját javítani kell;
- a `main` ág és a produkciós rendszer továbbra is változatlan.

Nagy PR esetén a `gh pr diff --name-only` 300 fájl felett HTTP 406 hibát adhat.
Ilyenkor a lapozott `pulls/{number}/files?per_page=100` API és a helyi
`git diff --name-only base...head` eredményét kell összehasonlítani.

## Előfeltételek

A feature ág csak akkor integrálható, ha:

1. a projektverzió minden forrásban `5.0.0-alpha.2`;
2. `bash scripts/validate-repository.sh` sikeres;
3. `node scripts/verify-alpha2-next-integration-readiness.js --require-git`
   sikeres;
4. `git diff --check` nem jelez hibát;
5. a feature working tree tiszta;
6. a feature commit felkerült az originre;
7. nincs közvetlen `main` merge vagy produkciós telepítés tervben.

## 1. Feature ág lezárása

```bash
cd ~/Github

git switch feature/v5-server-modularization
git pull --ff-only origin feature/v5-server-modularization

git status --short
bash scripts/validate-repository.sh
node scripts/verify-alpha2-next-integration-readiness.js --require-git
git diff --check
```

A `git status --short` a commit és push után legyen üres.

## 2. Integrációs ág létrehozása

Ne merge-elj közvetlenül a `next` ágon. Készíts külön, eldobható integrációs
ágat:

```bash
cd ~/Github

git fetch --prune origin

git switch next/v5-rearchitecture
git pull --ff-only origin next/v5-rearchitecture

git switch -c integration/v5-alpha2-server-modularization
```

## 3. Feature merge

```bash
git merge --no-ff feature/v5-server-modularization
```

Konfliktus esetén ne találomra válassz oldalt. Először:

```bash
git status
git diff --name-only --diff-filter=U
```

Ha a konfliktus nem oldható biztonságosan:

```bash
git merge --abort
git switch next/v5-rearchitecture
git branch -D integration/v5-alpha2-server-modularization
```

Ez nem érinti az origin ágat és nem érinti a produkciót.

## 4. Kötelező integrációs tesztek

Sikeres merge után:

```bash
bash scripts/validate-repository.sh
node scripts/verify-alpha2-next-integration-readiness.js --require-git
git diff --check
git status
```

Ezenfelül ellenőrizd:

```bash
python3 scripts/check-versions.py
node scripts/test-openapi-typescript-generator.js
node scripts/test-alpha2-version-finalization.js
node scripts/test-alpha2-version-finalization-manifest.js
node scripts/test-v5-documentation-status.js
node scripts/test-alpha2-next-integration-readiness.js
```

## 5. Integrációs ág feltöltése

```bash
git push -u origin integration/v5-alpha2-server-modularization
```

Pull Request:

```text
integration/v5-alpha2-server-modularization → next/v5-rearchitecture
```

A PR leírásában szerepeljen:

- minősített runtime candidate commit;
- Alpha.2 verzió;
- LXC gate/staging/rollback eredmény;
- production guard változatlan állapota;
- a finalizáló commit csak verziót, generált kliensmetaadatot,
  dokumentációt és ellenőrző toolingot módosít;
- a `main` és a produkciós telepítés nincs a PR hatókörében.

## 6. `next` merge utáni ellenőrzés

A PR merge után friss, tiszta munkakönyvtárban:

```bash
git switch next/v5-rearchitecture
git pull --ff-only origin next/v5-rearchitecture

git status --short
bash scripts/validate-repository.sh
node scripts/verify-alpha2-next-integration-readiness.js --require-git
```

Ezután külön staging/integrációs LXC-ben lehet új gate-et futtatni. A
produkciós `/opt/arduino-led-controller` repository nem válthat át `next` ágra.

## 7. Következő runtime munkacsomag

A következő kódmódosítás külön Alpha.3 feature branch legyen, például:

```text
feature/v5-arduino-device-key-header
```

Feladata:

- a szerver és Tauri kliens `X-Device-Key` fejlécet küldjön;
- a firmware a fejlécet ellenőrizze;
- rövid, dokumentált átmenetben maradjon query fallback;
- a titok ne jelenjen meg URL-ben, request logban vagy auditban;
- külön firmware- és valódi hardverteszt készüljön;
- új gate–staging–rollback evidence készüljön.

## 8. Tiltott műveletek

- közvetlen `feature` → `main` merge;
- közvetlen fejlesztés a `next` vagy `main` ágon;
- produkciós LXC branchváltása;
- produkciós env vagy Arduino-kulcs másolása stagingbe;
- Alpha.3 runtime módosítás belekeverése az Alpha.2 finalizáló commitba;
- produkciós telepítés kizárólag helyi tesztek alapján.
