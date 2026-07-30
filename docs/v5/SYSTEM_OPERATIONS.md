# V5 rendszerüzemeltetés

## Karbantartási mód

A karbantartási mód minden API v2 módosító kérést letilt, kivéve a mód
kikapcsolását és a kijelentkezést.

- `GET /api/v2/system/maintenance`
- `PUT /api/v2/system/maintenance`
- `DELETE /api/v2/system/maintenance`

## Konfigurációs preflight

A preflight ellenőrzi:

- Arduino privát API-útvonal és kulcs;
- API v2 tokenek;
- írható runtime könyvtárak;
- OpenAPI dokumentum;
- produkciós cookie- és CORS-beállítások.

Parancs:

```bash
bash deploy/system-preflight.sh
```

## Rendszer-snapshotok

A snapshot a konfigurációs és schedule állományokat fájlonkénti SHA-256
értékekkel menti.

A restore kizárólag karbantartási módban és a következő megerősítéssel fut:

```text
RESTORE_SYSTEM_SNAPSHOT
```

## Migrációk

A migrációs rendszer idempotens. Először dry-run ajánlott:

- `GET /api/v2/system/migrations`
- `POST /api/v2/system/migrations/actions/dry-run`
- `POST /api/v2/system/migrations/actions/apply`

## Staging telepítés

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  ENV_FILE=/etc/arduino-led-controller.env \
  SERVICE_NAME=arduino-led-controller \
  bash deploy/staging-deploy.sh
```

A folyamat repository-validációt, preflightot, snapshotot, szolgáltatás-
újraindítást és health ellenőrzést végez.
