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

Ez még nem emel verziót. A következő külön csomag végzi a teljes
`5.0.0-alpha.2` verziószinkront.
