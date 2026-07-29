# Alpha.2 védett LXC orchestrator

## Kétlépcsős végrehajtás

A fő script szándékosan nem tartalmaz automatikus, jóváhagyás nélküli teljes
pipeline módot.

### Első szakasz

```bash
run-alpha2-lxc-orchestrator.sh gate-stage
```

Ez végrehajtja:

1. produkciós preflight;
2. production guard snapshot;
3. izolált candidate gate;
4. staging evidence bundle;
5. staging telepítés;
6. szándékos health-hibás rollback-próba;
7. staging és rollback receipt;
8. artifactcsomag.

A szakasz vége:

```text
awaiting-promotion
```

### Második szakasz

A promóció csak külön approval fájllal és pontos megerősítéssel indul:

```bash
PROMOTION_APPROVAL=/var/lib/arduino-led-controller/release-gates/alpha2-promotion-approval.json \
PROMOTION_CONFIRM=EXECUTE_ALPHA2_PROMOTION \
  run-alpha2-lxc-orchestrator.sh promote
```

A szakasz vége:

```text
ready-for-finalization
```

## Produkciós őr

A pipeline elején SHA-256 lenyomattal menti:

- aktuális Git ág;
- aktuális Git commit;
- teljes porcelain working-tree állapot;
- opcionális produkciós current symlink;
- szolgáltatás aktív állapota;
- production health eredménye.

Minden veszélyes fázis után újraellenőrzi ezeket. Eltérés esetén a pipeline
azonnal leáll.

## Állapot és artifactok

```text
/var/lib/arduino-led-controller/release-execution/
├── alpha2-orchestration-state.json
├── production-guard.json
├── production-guard-verification.json
├── staging-deployment.json
├── rollback-rehearsal.json
├── promotion-deployment.json
└── artifacts/
    ├── bundles/
    ├── index.json
    └── alpha2-execution-*.tar.gz
```

## API

```text
GET  /api/v2/release/lxc-orchestration
GET  /api/v2/release/lxc-artifacts
POST /api/v2/release/actions/verify-lxc-orchestration
```
