# Alpha.2 verziófinalizálás

## Minősített forrás

- candidate commit: `1236becc37e9b4d8ed2334f3cd60b455c248e82d`;
- produkciós baseline a gate idején:
  `58e01b40e4568f5cd2648d370614077ef08aa1ba`;
- célverzió: `5.0.0-alpha.2`.

## Előfeltételek

A verziószinkron csak az alábbi, repositoryn kívüli runtime evidence után
alkalmazható:

1. sikeres valódi LXC gate;
2. sikeres staging deployment;
3. sikeres rollback rehearsal;
4. sikeres promotion deployment;
5. érvényes staging–rollback–promotion receipt-lánc;
6. `FINALIZE_ALPHA2_VERSION_SYNC` jóváhagyás.

Az approval- és receipt-fájlok nem kerülnek Git-követés alá.

## A csomag korlátozása

A finalizáló csomag nem változtat produkciós runtime logikát. A módosítások
csak az alábbi kategóriákra korlátozódnak:

- verziófájlok és lockfile-ok;
- az OpenAPI dokumentumból determinisztikusan újragenerált TypeScript kliensfájlok;
- kiadási és migrációs dokumentáció;
- checklist;
- verzió- és manifestellenőrző tesztek.

Ez megakadályozza, hogy a minősített candidate után új, gate-en át nem ment
runtime kód kerüljön ugyanabba a kiadásba. A három generált TypeScript fájlban
csak az OpenAPI-verzió fejlécének szinkronja változik; az API-műveletek és
típusdefiníciók tartalma determinisztikusan változatlan marad.

## Merge-szabály

A finalizáló commit először a feature ágra kerül. A `main` ág módosítása nem
része ennek a csomagnak. A sorrend:

```text
feature/v5-server-modularization
→ next/v5-rearchitecture
→ külön integrációs ellenőrzés
→ main
```
