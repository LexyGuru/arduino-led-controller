# OTA bootGeneration authority

## Cél

Az OTA frissítés után megbízhatóan el kell dönteni, hogy az Arduino valóban újraindult
és a kívánt firmware fut-e. A Boot ID önmagában nem elég erős bizonyíték
same-version reinstall esetén, ezért Beta.8-tól tartós `bootGeneration` az elsődleges
authority.

## Kétfázisú OTA

```text
TRANSFER
   |
   | teljes BIN write + flush + socket lezárás
   v
API_CONFIRMATION
   |
   | cache-busted /api/v1/status polling
   v
SUCCESS / WRONG_FIRMWARE / TIMEOUT
```

A külső OTA port állapota a teljes BIN átadása után nem mérvadó a siker eldöntésére.

## Státuszmezők

A Beta.8 Direct API státusz tartalmazza:

- `firmwareVersion`
- `bootGeneration`
- `bootId`
- schedule persistence mezők

A `bootId` továbbra is hasznos diagnosztikára, de Beta.8-tól nem elsődleges reboot
authority.

## Döntési sorrend

### Van pre-update bootGeneration

Ha az indulás előtti és az új `bootGeneration` rendelkezésre áll:

- eltérő generation + várt verzió: siker;
- eltérő generation + hibás verzió: rollback/wrong firmware;
- azonos generation: polling folytatódik.

Same-version reinstall esetén a siker marker:

```text
SAME_VERSION_REINSTALL_CONFIRMED
```

Új firmware boot esetén:

```text
NEW_FIRMWARE_BOOT_CONFIRMED
```

### Beta.7 -> Beta.8 migráció

A Beta.7 még nem ad bootGeneration előértéket. Ha az indulás előtti verzió eltér a
várt Beta.8 verziótól és a friss Direct API már a várt Beta.8-at szolgálja ki:

```text
NEW_FIRMWARE_VERSION_TRANSITION_CONFIRMED
```

### Legacy fallback

Ha nincs bootGeneration, de van használható pre-update Boot ID, a megváltozott Boot ID
legacy fallbackként igazolhatja a rebootot:

```text
LEGACY_BOOT_ID_FALLBACK_CONFIRMED
```

## Timeout

A post-transfer API-confirmation ablak legfeljebb 180 másodperc, 3 másodperces
pollinggal. A státusz URL cache-busting query paramétert kap.

## Post-confirm réteg

A `confirm_restart()` sikeres visszatérése után a firmware-verzió és schedule
persistence tovább ellenőrizhető, de újabb Boot-ID-alapú success/failure döntés nem
futhat.

A `boot_id_after` megmaradhat a végső `FirmwareStatus` diagnosztikai mezőjében.

## External same-version classifier exact fix

A Beta.8 -> Beta.8 external BIN reinstall esetén az `expected` érték `None`,
ezért az előző klasszifikációs blokk mindig
`NEW_FIRMWARE_BOOT_CONFIRMED` eredményt adott akkor is, ha a telepítés előtti
és utáni firmware-verzió azonos volt.

A helyes összehasonlítás:
- `installed_before` vs az API által visszaadott aktuális `version`
- azonos verzió + megváltozott `bootGeneration` ->
  `SAME_VERSION_REINSTALL_CONFIRMED`
- eltérő verzió + megváltozott `bootGeneration` ->
  `NEW_FIRMWARE_BOOT_CONFIRMED`
