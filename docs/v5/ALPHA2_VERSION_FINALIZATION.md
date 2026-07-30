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
- checklist és master roadmap státuszszinkron;
- implementációs állapotjelentés és `next` integrációs runbook;
- verzió-, dokumentáció-, readiness- és manifestellenőrző tesztek.

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


## Dokumentációs lezárás és következő integráció

A finalizáló commit a hosszú távú `fejlesztes_readme.md` roadmapet és a rövid
`V5_REARCHITECTURE_CHECKLIST.md` állapotlistát ugyanarra a bizonyított
Alpha.2 mérföldkőre hozza. A következő lépés nem a `main`, hanem egy külön
integrációs branch és Pull Request a `next/v5-rearchitecture` ágba.

A következő runtime-változás, az Arduino API-kulcs `X-Device-Key` fejlécbe
költöztetése, külön Alpha.3 munkacsomag lesz. Így az Alpha.2 minősített
runtime candidate bizonyítékláncába nem kerül utólag gate-en át nem ment kód.
