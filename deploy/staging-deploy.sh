#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health/ready}"

cd "${APP_DIR}"

echo "[1/5] Repository-validáció"
bash scripts/validate-repository.sh

echo "[2/5] Konfigurációs preflight"
APP_DIR="${APP_DIR}" \
ENV_FILE="${ENV_FILE}" \
  bash deploy/system-preflight.sh

echo "[3/5] Verziózott rendszer-snapshot"
node - <<'NODE'
const {
  createRuntimePaths
} = require('./server/core/runtime-paths');

const {
  SystemSnapshotService
} = require('./server/system/snapshot-service');

(async () => {
  const paths =
    createRuntimePaths();

  const service =
    new SystemSnapshotService({
      snapshotsDir:
        paths.snapshotsDir,
      maximumSnapshots:
        10,
      sources: [
        {
          name:
            'config',
          path:
            paths.configDir
        },
        {
          name:
            'schedules',
          path:
            paths.schedulesDir
        }
      ]
    });

  const snapshot =
    await service.create({
      label:
        'staging-deploy'
    });

  console.log(
    `Snapshot: ${snapshot.id}`
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
NODE

echo "[4/5] Szolgáltatás újraindítása"
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"

echo "[5/5] Health ellenőrzés"
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error \
    "${HEALTH_URL}" >/dev/null; then
    echo "Staging telepítés sikeres."
    exit 0
  fi

  sleep 2
done

echo "HIBA: a staging health ellenőrzés sikertelen." >&2
exit 1
