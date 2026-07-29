# Alpha.2 release-gate és promóciós runbook

## Fontos állapot

Ez a csomag **nem emeli meg automatikusan** a projektverziót. A repository
továbbra is `5.0.0-alpha.1`, amíg a valódi izolált LXC gate nem sikeres.

## 1. Candidate branch letöltése az LXC-ben

A produkciós repository maradhat a `main` ágon. A gate runner külön detached
worktree-ben futtatja a feature branch saját tesztjeit:

```bash
cd /opt/arduino-led-controller

sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=origin/feature/v5-server-modularization \
  ENV_FILE=/etc/arduino-led-controller.env \
  SERVICE_NAME=arduino-led-controller \
  REPORT_DIR=/var/lib/arduino-led-controller/release-gates \
  bash deploy/run-alpha2-release-gate.sh
```

A folyamat:

1. `git fetch`;
2. candidate commit feloldása;
3. izolált detached worktree;
4. candidate repository-validáció és API teszt;
5. rollback teszt;
6. produkciós systemd szolgáltatás utóellenőrzése;
7. gépi JSON jelentés;
8. jelentés commit- és korvalidációja.

## 2. Gate jelentés ellenőrzése Macen

Másold át az LXC-ről a JSON jelentést, majd:

```bash
cd ~/Github

node scripts/verify-release-gate-report.js \
  --report ~/Downloads/alpha2-YYYYMMDDTHHMMSSZ.json \
  --expected-commit "$(git rev-parse HEAD)"
```

## 3. API-s jóváhagyás

A V5 rendszeroldalon megjelenik az **Alpha.2 release-gate** panel. A promóció
csak akkor jóváhagyható, ha:

- a gate passed;
- a report a jelenlegi commitra készült;
- a report legfeljebb 72 órás;
- a preflight ready;
- nincs függő migráció;
- nincs aktív maintenance mód.

A backend megerősítése:

```text
APPROVE_ALPHA2_PROMOTION
```

## 4. Következő csomag

Sikeres gate és jóváhagyás után külön, teljes fájlokat tartalmazó
`5.0.0-alpha.2` verziószinkron csomag következik. Az fogja módosítani a
`VERSION`, npm, Tauri, Cargo, OpenAPI és generált TypeScript verziókat.
