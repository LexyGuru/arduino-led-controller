# Alpha.2 végrehajtási sorrend

## 1. Staging bundle telepítése

```bash
sudo RECEIPT_DIR=/var/lib/arduino-led-controller/release-execution \
  bash deploy/stage-alpha2-bundle.sh \
  dist/releases/<staging-bundle>.tar.gz
```

## 2. Rollback-próba

```bash
sudo RECEIPT_DIR=/var/lib/arduino-led-controller/release-execution \
  bash deploy/rehearse-alpha2-rollback.sh \
  dist/releases/<staging-bundle>.tar.gz
```

## 3. Promotion bundle telepítése

```bash
sudo RECEIPT_DIR=/var/lib/arduino-led-controller/release-execution \
  bash deploy/promote-alpha2-staging.sh \
  dist/releases/<promotion-bundle>.tar.gz
```

## 4. Receipt-lánc kézi ellenőrzése

```bash
node scripts/verify-alpha2-execution-receipts.js \
  --receipt-dir /var/lib/arduino-led-controller/release-execution \
  --commit <candidate-commit>
```

## 5. Véglegesítési readiness

A V5 rendszeroldalon az **Execution receipt-lánc** panelnek ezt kell mutatnia:

```text
Staging telepítés: passed
Rollback-próba: passed
Promotion telepítés: passed
Verziószinkronra kész
```

## 6. Véglegesítési jóváhagyás

```text
FINALIZE_ALPHA2_VERSION_SYNC
```

A jóváhagyás önmagában nem emel verziót. A külön finalizáló csomag ezután
egységesen `5.0.0-alpha.2` értékre állítja a verziófájlokat és lockfile-okat,
majd lefuttatja a teljes repository-validátort.

## 7. Verziófinalizáló csomag

A csomag alkalmazása után:

```bash
python3 scripts/check-versions.py
node scripts/test-alpha2-version-finalization.js
node scripts/test-alpha2-version-finalization-manifest.js
bash scripts/validate-repository.sh
git diff --check
```

A finalizáló commit először a feature ágra kerül. A `main` ág módosítása külön
integrációs és jóváhagyási lépés.
