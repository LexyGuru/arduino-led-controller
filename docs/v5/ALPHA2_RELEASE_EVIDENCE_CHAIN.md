# Alpha.2 release evidence chain

A kiadási archive csak akkor tekinthető telepíthetőnek, ha a bundle mellett
és a bundle belsejében is ellenőrizhető bizonyítéklánc található.

## Evidence fájlok

```text
release-evidence/
├── RELEASE-EVIDENCE.json
├── sbom.cdx.json
├── provenance.json
├── secret-scan.json
├── release-gate-report.json
└── promotion-approval.json   # csak promotion fázisban
```

## Kötelező ellenőrzések

1. A gate report `passed` állapotú, friss és ugyanarra a commitra vonatkozik.
2. Promotion bundle esetén a jóváhagyás ugyanarra a commitra és
   `5.0.0-alpha.2` célverzióra vonatkozik.
3. A CycloneDX SBOM a `package-lock.json` és `Cargo.lock` fájlból készül.
4. A provenance rögzíti a forrás commitot, verziót, fázist és buildert.
5. A titokvizsgálat nem tartalmazhat találatot.
6. Minden evidence artifact SHA-256 értéke szerepel a fő evidence fájlban.
7. A `RELEASE-METADATA.json` külön rögzíti a fő evidence SHA-256 értékét.

## Fázisok

### staging

Gate report szükséges, promóciós jóváhagyás még nem.

### promotion

Gate report és atomikus promóciós jóváhagyás is szükséges.

## Bundle készítése

```bash
GATE_REPORT=/var/lib/arduino-led-controller/release-gates/alpha2-....json \
PHASE=staging \
  bash deploy/build-alpha2-release-bundle.sh
```

Promotion:

```bash
GATE_REPORT=/var/lib/arduino-led-controller/release-gates/alpha2-....json \
PROMOTION_APPROVAL=/var/lib/arduino-led-controller/release-gates/alpha2-promotion-approval.json \
PHASE=promotion \
  bash deploy/build-alpha2-release-bundle.sh
```

## Titokvizsgálat

A találatokban nem jelenik meg a titok értéke. Csak:

- szabálykód;
- fájl;
- sorszám;
- értékhossz;
- az érték SHA-256 lenyomata.

Így a vizsgálati jelentés maga sem szivárogtat érzékeny adatot.
