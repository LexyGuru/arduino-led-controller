# Migráció 5.0.0-alpha.1 → 5.0.0-alpha.2

## Hatókör

Ez a verziófinalizáló csomag verziómetaadatokat, lockfile-okat,
dokumentációt és ellenőrzőteszteket módosít. Nem tartalmaz új, gate-en át nem
ment produkciós runtime funkciót.

A minősített runtime candidate commit:
`1236becc37e9b4d8ed2334f3cd60b455c248e82d`.

## Adatmigráció

Az Alpha.2 verziószinkron önmagában nem igényel adatbázis- vagy schedule-séma
átalakítást. A V5 migrációs szolgáltatás idempotens állapotfájlt és dry-run
ellenőrzést biztosít, ezért telepítés előtt továbbra is le kell futtatni a
rendszer-preflightot és a migrációs dry-runt.

## Konfiguráció

A produkciós `/etc/arduino-led-controller.env` fájlt a verziószinkron nem írja
felül. A meglévő `10.0.0.123:80` produkciós Arduino-cél és hitelesítési adatok
változatlanok.

A staging elkülönített konfigurációja:

- service: `arduino-led-controller-staging`;
- bind: `127.0.0.1:3100`;
- data: `/var/lib/arduino-led-controller-staging`;
- config: `/etc/arduino-led-controller-staging`;
- firmware: `/var/lib/arduino-led-controller-staging/firmware`;
- izolált Arduino-cél: `127.0.0.1:65535`.

A stagingbe nem szabad átmásolni a produkciós `ARDUINO_API_KEY`,
`OTA_PASSWORD` vagy valódi Arduino IP értékét.

## Ajánlott integrációs sorrend

1. A verziófinalizáló ZIP alkalmazása kizárólag a
   `feature/v5-server-modularization` ágon.
2. A teljes repository-validátor és a finalizáló manifestteszt futtatása.
3. Commit és push a feature ágra.
4. Beolvasztás a `next/v5-rearchitecture` ágba.
5. Új integrációs ellenőrzés és csak ezután külön, tudatos beolvasztás a
   `main` ágba.
6. A produkciós telepítés előtt snapshot, preflight és karbantartási eljárás.

A ZIP kibontása vagy a feature branch commitja önmagában nem telepít semmit az
LXC-re és nem indítja újra a produkciós szolgáltatást.

## Telepítés előtti ellenőrzések

- a produkciós checkout a várt ágon és commiton van;
- a working tree tiszta;
- a produkciós service aktív;
- a produkciós health végpont sikeres;
- nincs függő rendszer-migráció;
- a snapshot létrejött és visszaellenőrizhető;
- a release bundle, evidence és checksum érvényes.

## Rollback

A verziózott telepítő a korábbi release symlinket őrzi. Sikertelen health
ellenőrzés esetén az előző targetet kell visszaállítani. Első telepítés
hibájánál a félkész candidate könyvtárat el kell távolítani, a service-t le
kell állítani, és nem maradhat hibás `current` link.

A Git-szintű visszaállítás nem törölheti a repositoryt. A produkciós
adatkönyvtárak és az Arduino firmware külön backupfolyamatot használnak.

## Verzióellenőrzés

A következő parancsnak minden verzióforrásnál `5.0.0-alpha.2` értéket kell
jelentenie:

```bash
python3 scripts/check-versions.py
```

A teljes ellenőrzés:

```bash
node scripts/test-alpha2-version-finalization.js
node scripts/test-alpha2-version-finalization-manifest.js
bash scripts/validate-repository.sh
git diff --check
```
