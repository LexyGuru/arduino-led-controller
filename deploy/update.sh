#!/usr/bin/env bash
# Biztonságos automatikus frissítés és LXC futásidejű helyreállítás.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
STATE_DIR="${STATE_DIR:-/var/lib/arduino-led-controller}"
BRANCH="${UPDATE_BRANCH:-main}"
SERVICE_NAME="arduino-led-controller"
LOG_TAG="arduino-led-updater"
MODE="${1:-update}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
HEALTH_HOST="${HEALTH_HOST:-127.0.0.1}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-3}"

log() {
  logger -t "${LOG_TAG}" -- "$*" 2>/dev/null || true
  echo "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "HIBA: a frissítőt rootként futtasd."
  exit 1
fi

command -v curl >/dev/null 2>&1 || {
  log "HIBA: a HTTP health ellenőrzéshez szükséges curl nem található."
  exit 1
}

[[ -d "${APP_DIR}" ]] || {
  log "HIBA: nincs alkalmazáskönyvtár: ${APP_DIR}"
  exit 1
}

[[ -f "${APP_DIR}/server2_final.js" ]] || {
  log "HIBA: hiányzik a server2_final.js"
  exit 1
}

[[ -f "${APP_DIR}/server2_legacy.js" ]] || {
  log "HIBA: hiányzik a server2_legacy.js"
  exit 1
}

[[ -x "${APP_DIR}/deploy/ensure-node-dependencies.sh" ]] ||
  chmod +x "${APP_DIR}/deploy/ensure-node-dependencies.sh"

install_runtime_units() {
  log "Systemd fájlok szinkronizálása."

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller.service" \
    "/etc/systemd/system/${SERVICE_NAME}.service"

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller-update.service" \
    "/etc/systemd/system/${SERVICE_NAME}-update.service"

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller-update.timer" \
    "/etc/systemd/system/${SERVICE_NAME}-update.timer"

  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}.service" >/dev/null
  systemctl enable "${SERVICE_NAME}-update.timer" >/dev/null
}

repair_runtime() {
  local force_arg="${1:-}"

  install -d \
    -o arduino-led \
    -g arduino-led \
    -m 0750 \
    "${STATE_DIR}" \
    "${STATE_DIR}/npm-cache"

  if [[ "${force_arg}" == "--force" ]]; then
    APP_DIR="${APP_DIR}" \
    STATE_DIR="${STATE_DIR}" \
      bash "${APP_DIR}/deploy/ensure-node-dependencies.sh" --force
  else
    APP_DIR="${APP_DIR}" \
    STATE_DIR="${STATE_DIR}" \
      bash "${APP_DIR}/deploy/ensure-node-dependencies.sh"
  fi

  node --check "${APP_DIR}/server2_final.js"
  node --check "${APP_DIR}/server2_legacy.js"
  node --check "${APP_DIR}/server/health-bootstrap.js"
  node --check "${APP_DIR}/scripts/test-health-endpoints.js"
}

read_health_port() {
  local port="${PORT:-}"

  if [[ -z "${port}" && -r "${ENV_FILE}" ]]; then
    port="$(
      sed -n \
        's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*//p' \
        "${ENV_FILE}" |
        tail -n 1 |
        sed 's/[[:space:]]*#.*$//' |
        tr -d "\"'" |
        tr -d '[:space:]'
    )"
  fi

  port="${port:-3000}"

  if [[ ! "${port}" =~ ^[0-9]+$ ]] ||
     (( port < 1 || port > 65535 )); then
    log "HIBA: érvénytelen health check port: ${port}"
    return 1
  fi

  printf '%s\n' "${port}"
}

HEALTH_PORT="$(read_health_port)"
HEALTH_BASE_URL="http://${HEALTH_HOST}:${HEALTH_PORT}"

health_live() {
  curl \
    --fail \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/live" \
    >/dev/null 2>&1
}

health_ready() {
  curl \
    --fail \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/ready" \
    >/dev/null 2>&1
}

print_health_diagnostics() {
  log "Live health válasz:"

  curl \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/live" \
    >&2 || true

  echo >&2
  log "Ready health válasz:"

  curl \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/ready" \
    >&2 || true

  echo >&2
}

restart_and_verify() {
  log "Szolgáltatás újraindítása."

  systemctl reset-failed \
    "${SERVICE_NAME}.service" \
    >/dev/null 2>&1 || true

  systemctl restart "${SERVICE_NAME}.service"

  for _ in {1..45}; do
    if systemctl is-failed --quiet "${SERVICE_NAME}.service"; then
      break
    fi

    if systemctl is-active --quiet "${SERVICE_NAME}.service" &&
       health_live &&
       health_ready; then
      log "A szolgáltatás aktív, a live és ready health ellenőrzés sikeres."
      return 0
    fi

    sleep 1
  done

  log "HIBA: a szolgáltatás nem került működő és kész állapotba."
  print_health_diagnostics

  journalctl \
    -u "${SERVICE_NAME}.service" \
    -n 60 \
    --no-pager \
    >&2 || true

  return 1
}

cd "${APP_DIR}"

if [[ "${MODE}" == "--repair" || "${MODE}" == "repair" ]]; then
  log "Kényszerített LXC futásidejű javítás."
  install_runtime_units

  log "A szolgáltatás leállítása a tiszta függőségtelepítéshez."
  systemctl stop "${SERVICE_NAME}.service" >/dev/null 2>&1 || true

  repair_runtime --force
  restart_and_verify

  systemctl enable --now \
    "${SERVICE_NAME}-update.timer" \
    >/dev/null

  log "A javítás sikeresen befejeződött."
  exit 0
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Nincs Git munkakönyvtár; csak a futásidejű környezetet javítom."
  install_runtime_units
  repair_runtime
  restart_and_verify
  exit 0
fi

# Kézzel módosított követett fájlokat nem írunk felül.
if ! git -c safe.directory="${APP_DIR}" diff --quiet ||
   ! git -c safe.directory="${APP_DIR}" diff --cached --quiet; then
  log "Frissítés kihagyva: helyi, nem mentett módosítás található."
  install_runtime_units
  repair_runtime
  restart_and_verify
  exit 0
fi

git -c safe.directory="${APP_DIR}" \
  fetch --quiet origin "${BRANCH}"

REMOTE_REF="origin/${BRANCH}"
LOCAL_HEAD="$(
  git -c safe.directory="${APP_DIR}" rev-parse HEAD
)"
REMOTE_HEAD="$(
  git -c safe.directory="${APP_DIR}" rev-parse "${REMOTE_REF}"
)"

if [[ "${LOCAL_HEAD}" == "${REMOTE_HEAD}" ]]; then
  log "Nincs új GitHub-frissítés; függőség-, service- és health-ellenőrzés következik."

  install_runtime_units
  repair_runtime

  if ! systemctl is-active --quiet "${SERVICE_NAME}.service" ||
     ! health_live ||
     ! health_ready; then
    log "A szolgáltatás vagy a health állapot hibás; újraindítás következik."
    restart_and_verify
  else
    log "A szolgáltatás és a health ellenőrzések rendben vannak."
  fi

  exit 0
fi

if ! git -c safe.directory="${APP_DIR}" \
  merge-base --is-ancestor HEAD "${REMOTE_REF}"; then
  log "HIBA: a helyi és távoli ág eltért; automatikus fast-forward nem biztonságos."
  exit 1
fi

CHECK_DIR="$(mktemp -d /tmp/arduino-led-update.XXXXXX)"

cleanup() {
  git -c safe.directory="${APP_DIR}" \
    worktree remove --force "${CHECK_DIR}" \
    >/dev/null 2>&1 || true

  rm -rf "${CHECK_DIR}"
}

trap cleanup EXIT

log "Új verzió található; ellenőrzés külön munkakönyvtárban."

git -c safe.directory="${APP_DIR}" \
  worktree add --detach "${CHECK_DIR}" "${REMOTE_REF}" \
  >/dev/null

node --check "${CHECK_DIR}/server2_final.js"
node --check "${CHECK_DIR}/server2_legacy.js"
node --check "${CHECK_DIR}/server/health-bootstrap.js"
node --check "${CHECK_DIR}/scripts/test-health-endpoints.js"

(
  cd "${CHECK_DIR}"

  if [[ -f package-lock.json ]]; then
    npm ci \
      --omit=dev \
      --no-audit \
      --no-fund \
      --ignore-scripts \
      >/dev/null
  else
    npm install \
      --omit=dev \
      --no-audit \
      --no-fund \
      --ignore-scripts \
      --package-lock=false \
      >/dev/null
  fi

  node -e \
    "require.resolve('express'); require.resolve('socket.io'); require.resolve('axios')"

  npm run test:health
)

log "Ellenőrzés sikeres; frissítés telepítése."

git -c safe.directory="${APP_DIR}" \
  pull --ff-only origin "${BRANCH}"

chmod +x "${APP_DIR}/deploy/"*.sh
chmod +x "${APP_DIR}/scripts/"*.sh 2>/dev/null || true

install_runtime_units
repair_runtime
restart_and_verify

systemctl enable --now \
  "${SERVICE_NAME}-update.timer" \
  >/dev/null

log "Frissítés sikeresen befejeződött."
