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
STATE_DIR="${STATE_DIR:-/var/lib/${SERVICE_NAME}}"
ARDUINO_IP="${ARDUINO_IP:-10.0.0.117}"

echo "==> Alapcsomagok telepítése"
apt-get update
apt-get install -y ca-certificates curl git gnupg rsync unzip bzip2

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  echo "==> Node.js 22 telepítése"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id -u arduino-led >/dev/null 2>&1; then
  useradd --system --home "${STATE_DIR}" --shell /usr/sbin/nologin arduino-led
fi

# Az npm gyorsítótára ne az alkalmazáskód mellé kerüljön. Így az alkalmazás
# telepítése akkor is működik, ha /opt külön csatolt kötet vagy korlátozott LXC.
install -d -o arduino-led -g arduino-led -m 0750 "${STATE_DIR}/npm-cache"

echo "==> Alkalmazás telepítése: ${APP_DIR}"
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude data --exclude config --exclude schedules --exclude .env \
  "${SOURCE_DIR}/" "${APP_DIR}/"

mkdir -p "${APP_DIR}/data" "${APP_DIR}/config" "${APP_DIR}/schedules"
chown -R arduino-led:arduino-led "${APP_DIR}"
# A Git munkakönyvtárat a root kezeli (a frissítő szolgáltatás is rootként fut).
# Így a kézi `git pull` nem akad el a Git tulajdonosi biztonsági ellenőrzésén.
if [[ -d "${APP_DIR}/.git" ]]; then
  chown -R root:root "${APP_DIR}/.git"
fi

echo "==> Arduino OTA feltöltőeszköz telepítése"
APP_DIR="${APP_DIR}" bash "${APP_DIR}/deploy/install-ota-tool.sh"

echo "==> Node függőségek telepítése"
cd "${APP_DIR}"
runuser -u arduino-led -- env \
  HOME="${STATE_DIR}" \
  npm_config_cache="${STATE_DIR}/npm-cache" \
  npm install --omit=dev --no-audit --no-fund

if [[ ! -f /etc/arduino-led-controller.env ]]; then
  cp "${APP_DIR}/.env.example" /etc/arduino-led-controller.env
  sed -i "s/^ARDUINO_IP=.*/ARDUINO_IP=${ARDUINO_IP}/" /etc/arduino-led-controller.env
  chmod 640 /etc/arduino-led-controller.env
  chown root:arduino-led /etc/arduino-led-controller.env
fi

grep -q '^BIND_HOST=' /etc/arduino-led-controller.env || echo 'BIND_HOST=127.0.0.1' >> /etc/arduino-led-controller.env
grep -q '^COOKIE_SECURE=' /etc/arduino-led-controller.env || echo 'COOKIE_SECURE=1' >> /etc/arduino-led-controller.env

install -m 644 "${APP_DIR}/deploy/arduino-led-controller.service" "/etc/systemd/system/${SERVICE_NAME}.service"
install -m 644 "${APP_DIR}/deploy/arduino-led-controller-update.service" "/etc/systemd/system/${SERVICE_NAME}-update.service"
install -m 644 "${APP_DIR}/deploy/arduino-led-controller-update.timer" "/etc/systemd/system/${SERVICE_NAME}-update.timer"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl enable --now "${SERVICE_NAME}-update.timer"
HTTPS_HOST="${HTTPS_HOST:-}" PORT="${PORT:-3000}" bash "${APP_DIR}/deploy/install-https.sh"

echo
echo "Telepítés kész."
echo "Állapot: systemctl status ${SERVICE_NAME}"
echo "Napló:    journalctl -u ${SERVICE_NAME} -f"
echo "Frissítő: systemctl status ${SERVICE_NAME}-update.timer"
echo "Web:      https://<LXC-IP>"
echo "Arduino IP beállítás: /etc/arduino-led-controller.env"
echo "OTA jelszó: add meg az OTA_PASSWORD értéket ugyanebben a fájlban."
