# V5 repository cleanup

**Alap commit:** `b9d0235dba9d400212c2f1b2768bb10b2746ba66`
**Célág:** `next/v5-rearchitecture`
**Alkalmazás:** `5.0.0-beta.1`
**Firmware:** `4.3.0-beta.1`
**Direct API:** `1.0.0`

## Eredmény

- hozzáadott fájlok: 9;
- módosított fájlok: 18;
- törölt fájlok: 135;
- végleges fájlszám a csomagban: 420.

## Takarítás

- IDE- és régi gyökérfájlok eltávolítása;
- Alpha.2/Alpha.3/F14 patchdokumentumok összevonása;
- egyszer használatos package manifestek és tesztjeik eltávolítása;
- Alpha-specifikus deploy segédletek eltávolítása;
- README, firmware-, V5-, Beta-, biztonsági és közreműködési dokumentáció újraírása;
- Beta workflow firmware-elvárás frissítése;
- aktív tesztlánc és repository-validator egyszerűsítése.

## Megtartott kompatibilitási réteg

A `server/`, az általános `deploy/` és a Tauri jelenlegi szerver/LXC adapterei szándékosan megmaradtak. Ezek eltávolítása vagy elkülönítése a következő Tauri refaktor része, mert jelenleg futásidejű importfüggőségeik vannak.

## Ellenőrzés

A csomagban sikeres volt:

- minden JavaScript `node --check`;
- minden shell fájl `bash -n`;
- Markdown relatív linkellenőrzés;
- V5 dokumentációs teszt;
- Beta workflow szerződésteszt;
- F14 remote reboot szerződésteszt;
- Alpha.3 header-auth regresszió;
- új repository-validator.

A teljes `npm ci && npm test` a kész csomag alkalmazása után, a fejlesztői Macen futtatandó.
