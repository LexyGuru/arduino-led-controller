#!/usr/bin/env bash
# Ellenőrzi és szükség esetén helyreállítja az LXC Node.js futásidejű függőségeit.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
STATE_DIR="${STATE_DIR:-/var/lib/arduino-led-controller}"
SERVICE_USER="${SERVICE_USER:-arduino-led}"
SERVICE_GROUP="${SERVICE_GROUP:-arduino-led}"
FORCE_INSTALL=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE_INSTALL=1
fi

PACKAGE_JSON="${APP_DIR}/package.json"
PACKAGE_LOCK="${APP_DIR}/package-lock.json"
CACHE_DIR="${STATE_DIR}/npm-cache"
STAMP_FILE="${STATE_DIR}/npm-runtime.sha256"
LOCK_FILE="${STATE_DIR}/npm-install.lock"

log() {
  echo "[LXC függőségek] $*"
}

[[ -f "${PACKAGE_JSON}" ]] || {
  log "HIBA: nem található: ${PACKAGE_JSON}"
  exit 1
}

if [[ "${EUID}" -eq 0 ]]; then
  if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
    log "HIBA: nem létezik a szolgáltatás felhasználója: ${SERVICE_USER}"
    exit 1
  fi
  install -d -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" -m 0750 "${STATE_DIR}" "${CACHE_DIR}"
  install -d -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" -m 0755 "${APP_DIR}"
else
  mkdir -p "${STATE_DIR}" "${CACHE_DIR}"
fi

# Ne indulhasson egyszerre a timer, a systemd ExecStartPre és egy kézi javítás.
if [[ "${EUID}" -eq 0 ]]; then
  touch "${LOCK_FILE}"
  chown "${SERVICE_USER}:${SERVICE_GROUP}" "${LOCK_FILE}"
fi
exec 9>"${LOCK_FILE}"
flock 9

dependency_hash() {
  if [[ -f "${PACKAGE_LOCK}" ]]; then
    sha256sum "${PACKAGE_JSON}" "${PACKAGE_LOCK}" | sha256sum | awk '{print $1}'
  else
    sha256sum "${PACKAGE_JSON}" | awk '{print $1}'
  fi
}

modules_available() {
  (
    cd "${APP_DIR}"
    NODE_ENV=production node <<'NODE'
const packageJson = require('./package.json');
const modules = Object.keys(packageJson.dependencies || {});
for (const name of modules) {
  require.resolve(name);
}
NODE
  ) >/dev/null 2>&1
}

write_stamp() {
  printf '%s\n' "${CURRENT_HASH}" > "${STAMP_FILE}"
  if [[ "${EUID}" -eq 0 ]]; then
    chown "${SERVICE_USER}:${SERVICE_GROUP}" "${STAMP_FILE}"
    chmod 0640 "${STAMP_FILE}"
  fi
}

CURRENT_HASH="$(dependency_hash)"
SAVED_HASH=""
[[ -f "${STAMP_FILE}" ]] && SAVED_HASH="$(cat "${STAMP_FILE}" 2>/dev/null || true)"

if [[ "${FORCE_INSTALL}" -eq 0 ]] && [[ "${CURRENT_HASH}" == "${SAVED_HASH}" ]] && modules_available; then
  log "A futásidejű csomagok rendben vannak."
  exit 0
fi

if modules_available && [[ "${FORCE_INSTALL}" -eq 0 ]]; then
  log "A modulok elérhetők, csak az állapotjelző frissül."
  write_stamp
  exit 0
fi

log "Hiányzó vagy megváltozott Node.js függőségek telepítése…"

run_npm() {
  if [[ "${EUID}" -eq 0 ]]; then
    runuser -u "${SERVICE_USER}" -- env \
      HOME="${STATE_DIR}" \
      NODE_ENV=production \
      npm_config_cache="${CACHE_DIR}" \
      "$@"
  else
    env \
      HOME="${STATE_DIR}" \
      NODE_ENV=production \
      npm_config_cache="${CACHE_DIR}" \
      "$@"
  fi
}

if [[ -f "${PACKAGE_LOCK}" ]]; then
  run_npm npm ci --omit=dev --no-audit --no-fund
else
  run_npm npm install --omit=dev --no-audit --no-fund --package-lock=false
fi

modules_available || {
  log "HIBA: az npm telepítés után sem érhető el minden szükséges modul."
  exit 1
}

write_stamp
log "A Node.js futásidejű függőségek rendben vannak."
