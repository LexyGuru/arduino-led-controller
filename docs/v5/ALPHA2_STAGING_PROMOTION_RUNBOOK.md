# Alpha.2 staging és promóciós runbook

## 1. Izolált LXC gate

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=origin/feature/v5-server-modularization \
  ENV_FILE=/etc/arduino-led-controller.env \
  SERVICE_NAME=arduino-led-controller \
  REPORT_DIR=/var/lib/arduino-led-controller/release-gates \
  bash /tmp/run-alpha2-release-gate.sh
```

## 2. Staging evidence bundle

A fejlesztőgépen a gate report másolatával:

```bash
GATE_REPORT=~/Downloads/alpha2-gate.json \
PHASE=staging \
  bash deploy/build-alpha2-release-bundle.sh
```

## 3. Staging telepítés

```bash
sudo bash deploy/stage-alpha2-bundle.sh \
  dist/releases/arduino-led-controller-*.tar.gz
```

## 4. Rollback-próba

A próba szándékosan hibás health URL-t használ, és csak `staging` nevű
telepítési útvonalon hajlandó futni.

```bash
sudo bash deploy/rehearse-alpha2-rollback.sh \
  dist/releases/arduino-led-controller-*.tar.gz
```

Sikeres eredmény:

```text
OK: staging rollback-próba, current változatlan
```

## 5. Promóciós jóváhagyás

A V5 rendszeroldalon vagy az API-n keresztül:

```text
APPROVE_ALPHA2_PROMOTION
```

## 6. Promotion evidence bundle

```bash
GATE_REPORT=~/Downloads/alpha2-gate.json \
PROMOTION_APPROVAL=~/Downloads/alpha2-promotion-approval.json \
PHASE=promotion \
  bash deploy/build-alpha2-release-bundle.sh
```

## 7. Promotion bundle ellenőrzése

```bash
PHASE=promotion \
  bash deploy/verify-alpha2-release-bundle.sh \
  dist/releases/arduino-led-controller-*.tar.gz
```

A csomag nem módosítja automatikusan a produkciós `main` ágat, és nem végzi el
a `5.0.0-alpha.2` verzióemelést. A verziószinkron csak sikeres gate, staging,
rollback-próba és promóciós evidence után következik.
