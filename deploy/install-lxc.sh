#!/usr/bin/env bash
# Telepítő Debian 12 alapú Proxmox LXC konténerhez.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ezt a telepítőt rootként futtasd: sudo bash deploy/install-lxc.sh"
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="arduino-led-controller"
ARDUINO_IP="${ARDUINO_IP:-10.0.0.117}"

echo "==> Alapcsomagok telepítése"
apt-get update
apt-get install -y ca-certificates curl gnupg rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  echo "==> Node.js 22 telepítése"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id -u arduino-led >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin arduino-led
fi

echo "==> Alkalmazás telepítése: ${APP_DIR}"
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude data --exclude config --exclude schedules --exclude .env \
  "${SOURCE_DIR}/" "${APP_DIR}/"

mkdir -p "${APP_DIR}/data" "${APP_DIR}/config" "${APP_DIR}/schedules"
chown -R arduino-led:arduino-led "${APP_DIR}"

echo "==> Node függőségek telepítése"
cd "${APP_DIR}"
runuser -u arduino-led -- npm install --omit=dev --no-audit --no-fund

if [[ ! -f /etc/arduino-led-controller.env ]]; then
  cp "${APP_DIR}/.env.example" /etc/arduino-led-controller.env
  sed -i "s/^ARDUINO_IP=.*/ARDUINO_IP=${ARDUINO_IP}/" /etc/arduino-led-controller.env
  chmod 640 /etc/arduino-led-controller.env
  chown root:arduino-led /etc/arduino-led-controller.env
fi

install -m 644 "${APP_DIR}/deploy/arduino-led-controller.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

echo
echo "Telepítés kész."
echo "Állapot: systemctl status ${SERVICE_NAME}"
echo "Napló:    journalctl -u ${SERVICE_NAME} -f"
echo "Web:      http://<LXC-IP>:3000"
echo "Arduino IP beállítás: /etc/arduino-led-controller.env"
