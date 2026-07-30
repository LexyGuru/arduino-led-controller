# Valódi LXC alpha.2 orchestrator runbook

## 1. Script lekérése a feature ágról

A produkciós `main` working tree nem változik:

```bash
cd /opt/arduino-led-controller
git fetch origin feature/v5-server-modularization

git show \
  origin/feature/v5-server-modularization:deploy/run-alpha2-lxc-orchestrator.sh \
  > /tmp/run-alpha2-lxc-orchestrator.sh

chmod +x /tmp/run-alpha2-lxc-orchestrator.sh
```

A fő script exact candidate worktree-t hoz létre, és az összes további fájlt
abból használja.

## 2. Preflight

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=origin/feature/v5-server-modularization \
  bash /tmp/run-alpha2-lxc-orchestrator.sh preflight
```

## 3. Gate, staging és rollback

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=origin/feature/v5-server-modularization \
  ENV_FILE=/etc/arduino-led-controller.env \
  bash /tmp/run-alpha2-lxc-orchestrator.sh gate-stage
```

## 4. Állapot

```bash
sudo bash /tmp/run-alpha2-lxc-orchestrator.sh status
```

Elvárt állapot:

```text
awaiting-promotion
```

## 5. Promotion

A V5 felületen először létre kell hozni a promóciós approval fájlt.

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=origin/feature/v5-server-modularization \
  PROMOTION_APPROVAL=/var/lib/arduino-led-controller/release-gates/alpha2-promotion-approval.json \
  PROMOTION_CONFIRM=EXECUTE_ALPHA2_PROMOTION \
  bash /tmp/run-alpha2-lxc-orchestrator.sh promote
```

Elvárt állapot:

```text
ready-for-finalization
```

## 6. Ellenőrzés és artifactgyűjtés

```bash
sudo bash /tmp/run-alpha2-lxc-orchestrator.sh verify
sudo bash /tmp/run-alpha2-lxc-orchestrator.sh collect
```

A folyamat egyetlen ponton sem váltja át a produkciós `main` ágat, és nem
módosítja a produkciós application working tree-t.
