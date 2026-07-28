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
elif [[ -n "${1:-}" ]]; then
  echo "[LXC függőségek] HIBA: ismeretlen argumentum: ${1}" >&2
  exit 2
fi

PACKAGE_JSON="${APP_DIR}/package.json"
PACKAGE_LOCK="${APP_DIR}/package-lock.json"
MODULES_DIR="${APP_DIR}/node_modules"
CACHE_DIR="${STATE_DIR}/npm-cache"
STAMP_FILE="${STATE_DIR}/npm-runtime.sha256"
LOCK_FILE="${STATE_DIR}/npm-install.lock"

log() {
  echo "[LXC függőségek] $*"
}

fail() {
  log "HIBA: $*"
  exit 1
}

validate_paths() {
  [[ -n "${APP_DIR}" && "${APP_DIR}" != "/" ]] ||
    fail "veszélyes APP_DIR érték: ${APP_DIR}"

  [[ -n "${STATE_DIR}" && "${STATE_DIR}" != "/" ]] ||
    fail "veszélyes STATE_DIR érték: ${STATE_DIR}"

  [[ "${MODULES_DIR}" == "${APP_DIR%/}/node_modules" ]] ||
    fail "érvénytelen node_modules útvonal: ${MODULES_DIR}"
}

tree_has_foreign_owner() {
  local target="$1"

  [[ -e "${target}" ]] || return 1
  [[ "${EUID}" -eq 0 ]] || return 1

  find "${target}" -xdev \
    \( ! -user "${SERVICE_USER}" -o ! -group "${SERVICE_GROUP}" \) \
    -print -quit 2>/dev/null |
    grep -q .
}

repair_cache_ownership() {
  if [[ "${EUID}" -eq 0 ]] && tree_has_foreign_owner "${CACHE_DIR}"; then
    log "Az npm-cache tulajdonjogának javítása."
    chown -R "${SERVICE_USER}:${SERVICE_GROUP}" "${CACHE_DIR}"
  fi
}

remove_modules_safely() {
  validate_paths

  if [[ -e "${MODULES_DIR}" || -L "${MODULES_DIR}" ]]; then
    log "A node_modules könyvtár tiszta eltávolítása."
    rm -rf --one-file-system -- "${MODULES_DIR}"
  fi

  if [[ "${EUID}" -eq 0 ]]; then
    install -d \
      -o "${SERVICE_USER}" \
      -g "${SERVICE_GROUP}" \
      -m 0755 \
      "${MODULES_DIR}"
  else
    mkdir -p "${MODULES_DIR}"
  fi
}

validate_paths

[[ -f "${PACKAGE_JSON}" ]] ||
  fail "nem található: ${PACKAGE_JSON}"

if [[ "${EUID}" -eq 0 ]]; then
  id -u "${SERVICE_USER}" >/dev/null 2>&1 ||
    fail "nem létezik a szolgáltatás felhasználója: ${SERVICE_USER}"

  getent group "${SERVICE_GROUP}" >/dev/null 2>&1 ||
    fail "nem létezik a szolgáltatás csoportja: ${SERVICE_GROUP}"

  install -d \
    -o "${SERVICE_USER}" \
    -g "${SERVICE_GROUP}" \
    -m 0750 \
    "${STATE_DIR}" \
    "${CACHE_DIR}"

  # Az alkalmazás forráskönyvtárának és a .git könyvtárnak a
  # tulajdonjogát szándékosan nem módosítjuk.
  repair_cache_ownership
else
  mkdir -p "${STATE_DIR}" "${CACHE_DIR}"

  [[ -w "${APP_DIR}" ]] ||
    fail "az alkalmazáskönyvtár nem írható: ${APP_DIR}"

  [[ -w "${CACHE_DIR}" ]] ||
    fail "az npm-cache nem írható: ${CACHE_DIR}"
fi

if [[ "${EUID}" -eq 0 ]]; then
  touch "${LOCK_FILE}"
  chown "${SERVICE_USER}:${SERVICE_GROUP}" "${LOCK_FILE}"
  chmod 0640 "${LOCK_FILE}"
fi

exec 9>"${LOCK_FILE}"
flock 9

dependency_hash() {
  if [[ -f "${PACKAGE_LOCK}" ]]; then
    sha256sum "${PACKAGE_JSON}" "${PACKAGE_LOCK}" |
      sha256sum |
      awk '{print $1}'
  else
    sha256sum "${PACKAGE_JSON}" |
      awk '{print $1}'
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

CURRENT_HASH="$(dependency_hash)"
SAVED_HASH=""

if [[ -f "${STAMP_FILE}" ]]; then
  SAVED_HASH="$(cat "${STAMP_FILE}" 2>/dev/null || true)"
fi

if [[ "${FORCE_INSTALL}" -eq 1 ]]; then
  log "Kényszerített tiszta függőségtelepítés."
  remove_modules_safely
elif [[ "${EUID}" -eq 0 ]] && tree_has_foreign_owner "${MODULES_DIR}"; then
  log "Nem megfelelő tulajdonú node_modules fájlok találhatók."
  remove_modules_safely
fi

if [[ "${FORCE_INSTALL}" -eq 0 ]] &&
   [[ "${CURRENT_HASH}" == "${SAVED_HASH}" ]] &&
   modules_available; then
  log "A futásidejű csomagok rendben vannak."
  exit 0
fi

if modules_available && [[ "${FORCE_INSTALL}" -eq 0 ]]; then
  log "A modulok elérhetők, csak az állapotjelző frissül."
  write_stamp
  exit 0
fi

log "Hiányzó vagy megváltozott Node.js függőségek telepítése."

if [[ -f "${PACKAGE_LOCK}" ]]; then
  run_npm npm ci --omit=dev --no-audit --no-fund
else
  run_npm npm install \
    --omit=dev \
    --no-audit \
    --no-fund \
    --package-lock=false
fi

modules_available ||
  fail "az npm telepítés után sem érhető el minden szükséges modul"

write_stamp
log "A Node.js futásidejű függőségek rendben vannak."
