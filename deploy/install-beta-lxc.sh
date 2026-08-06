#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="${BETA_VERSION:-5.0.0-beta.7}"
TAG="v${VERSION}"
REPOSITORY="${BETA_REPOSITORY:-LexyGuru/arduino-led-controller}"
ASSET_NAME="Arduino_LED_Controller_${VERSION}_LXC_Server.tar.gz"
RELEASE_BASE="https://github.com/${REPOSITORY}/releases/download/${TAG}"
ARCHIVE="${BETA_ARCHIVE:-}"
CHECKSUMS="${BETA_CHECKSUMS:-}"
BETA_CONFIG_FILE="${BETA_CONFIG_FILE:-}"
ALLOW_PRODUCTION_ARDUINO="${ALLOW_PRODUCTION_ARDUINO:-0}"
INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}"
STAGING_PORT="${STAGING_PORT:-3100}"
STAGING_BIND_HOST="${STAGING_BIND_HOST:-127.0.0.1}"
STAGING_ARDUINO_IP="${STAGING_ARDUINO_IP:-127.0.0.1}"
STAGING_ARDUINO_PORT="${STAGING_ARDUINO_PORT:-65535}"
STAGING_ARDUINO_API_PATH="${STAGING_ARDUINO_API_PATH:-/__beta1_staging_disabled__}"
STAGING_ARDUINO_API_KEY="${STAGING_ARDUINO_API_KEY:-<BETA1_STAGING_DISABLED_API_KEY>}"
TEMP_DIR="$(mktemp -d)"
DOWNLOAD_DIR="${TEMP_DIR}/download"
EXTRACT_DIR="${TEMP_DIR}/extract"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

log() {
  printf '[beta-lxc-install] %s\n' "$*"
}

[[ "$(id -u)" -eq 0 ]] || {
  log 'HIBA: root jogosultság szükséges.'
  exit 1
}

if [[ -n "${BETA_CONFIG_FILE}" ]]; then
  [[ -f "${BETA_CONFIG_FILE}" ]] || {
    log "HIBA: nem található konfiguráció: ${BETA_CONFIG_FILE}"
    exit 1
  }
  chmod 0600 "${BETA_CONFIG_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${BETA_CONFIG_FILE}"
  set +a
  ALLOW_PRODUCTION_ARDUINO="${ALLOW_PRODUCTION_ARDUINO:-0}"
  STAGING_PORT="${STAGING_PORT:-3100}"
  STAGING_BIND_HOST="${STAGING_BIND_HOST:-127.0.0.1}"
  STAGING_ARDUINO_IP="${STAGING_ARDUINO_IP:-127.0.0.1}"
  STAGING_ARDUINO_PORT="${STAGING_ARDUINO_PORT:-65535}"
  STAGING_ARDUINO_API_PATH="${STAGING_ARDUINO_API_PATH:-/__beta1_staging_disabled__}"
  STAGING_ARDUINO_API_KEY="${STAGING_ARDUINO_API_KEY:-<BETA1_STAGING_DISABLED_API_KEY>}"
fi

if [[ "${STAGING_ARDUINO_IP}" == '10.0.0.123' && "${ALLOW_PRODUCTION_ARDUINO}" != '1' ]]; then
  log 'HIBA: a produkciós Arduino IP Beta stagingben alapból tiltott.'
  exit 1
fi

for command in curl tar node npm systemctl sha256sum; do
  command -v "${command}" >/dev/null 2>&1 || {
    log "HIBA: hiányzó parancs: ${command}"
    exit 1
  }
done

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 20 )); then
  log "HIBA: Node.js 20 vagy újabb szükséges; jelenlegi főverzió: ${NODE_MAJOR}"
  exit 1
fi

mkdir -p "${DOWNLOAD_DIR}" "${EXTRACT_DIR}"

if [[ -z "${ARCHIVE}" ]]; then
  ARCHIVE="${DOWNLOAD_DIR}/${ASSET_NAME}"
  log "Beta LXC csomag letöltése: ${TAG}"
  curl -fL --retry 3 --connect-timeout 15 --max-time 600 \
    "${RELEASE_BASE}/${ASSET_NAME}" \
    -o "${ARCHIVE}"
fi

if [[ -z "${CHECKSUMS}" ]]; then
  CHECKSUMS="${DOWNLOAD_DIR}/SHA256SUMS"
  curl -fL --retry 3 --connect-timeout 15 --max-time 120 \
    "${RELEASE_BASE}/SHA256SUMS" \
    -o "${CHECKSUMS}"
fi

[[ -f "${ARCHIVE}" ]] || {
  log "HIBA: hiányzó archívum: ${ARCHIVE}"
  exit 1
}
[[ -f "${CHECKSUMS}" ]] || {
  log "HIBA: hiányzó SHA256SUMS: ${CHECKSUMS}"
  exit 1
}

EXPECTED_SHA="$(awk -v name="$(basename "${ARCHIVE}")" '$2 == name || $2 == "*" name { print $1; exit }' "${CHECKSUMS}")"
[[ "${EXPECTED_SHA}" =~ ^[a-fA-F0-9]{64}$ ]] || {
  log 'HIBA: az archívum ellenőrzőösszege nem található.'
  exit 1
}
ACTUAL_SHA="$(sha256sum "${ARCHIVE}" | awk '{print $1}')"
[[ "${ACTUAL_SHA}" == "${EXPECTED_SHA}" ]] || {
  log 'HIBA: az LXC archívum SHA-256 ellenőrzése sikertelen.'
  exit 1
}
printf '%s  %s\n' "${ACTUAL_SHA}" "${ARCHIVE}" > "${ARCHIVE}.sha256"
log 'SHA-256 ellenőrzés sikeres.'

tar -xzf "${ARCHIVE}" -C "${EXTRACT_DIR}"
SOURCE_ROOT="$(find "${EXTRACT_DIR}" -mindepth 1 -maxdepth 1 -type d -print -quit)"
[[ -n "${SOURCE_ROOT}" ]] || {
  log 'HIBA: az archívum nem tartalmaz forráskönyvtárat.'
  exit 1
}

for script in \
  deploy/install-staging-service.sh \
  deploy/install-versioned-release.sh \
  deploy/verify-versioned-release.sh; do
  [[ -f "${SOURCE_ROOT}/${script}" ]] || {
    log "HIBA: hiányzó telepítőkomponens: ${script}"
    exit 1
  }
done

log 'Beta staging systemd környezet telepítése.'
STAGING_PORT="${STAGING_PORT}" \
STAGING_BIND_HOST="${STAGING_BIND_HOST}" \
STAGING_ARDUINO_IP="${STAGING_ARDUINO_IP}" \
STAGING_ARDUINO_PORT="${STAGING_ARDUINO_PORT}" \
STAGING_ARDUINO_API_PATH="${STAGING_ARDUINO_API_PATH}" \
STAGING_ARDUINO_API_KEY="${STAGING_ARDUINO_API_KEY}" \
ALLOW_PRODUCTION_ARDUINO="${ALLOW_PRODUCTION_ARDUINO}" \
INSTALL_ROOT="${INSTALL_ROOT}" \
bash "${SOURCE_ROOT}/deploy/install-staging-service.sh"

log 'Verziózott Beta release aktiválása.'
CHECKSUM_FILE="${ARCHIVE}.sha256" \
INSTALL_ROOT="${INSTALL_ROOT}" \
SERVICE_NAME="${SERVICE_NAME}" \
HEALTH_URL="http://127.0.0.1:${STAGING_PORT}/health/ready" \
VERIFY_SCRIPT="${SOURCE_ROOT}/deploy/verify-versioned-release.sh" \
REQUIRE_RELEASE_EVIDENCE=0 \
bash "${SOURCE_ROOT}/deploy/install-versioned-release.sh" "${ARCHIVE}"

log "Telepítés sikeres: ${VERSION}"
log "Szolgáltatás: ${SERVICE_NAME}"
log "Health: http://127.0.0.1:${STAGING_PORT}/health/ready"
log "Rollback: bash ${INSTALL_ROOT}/current/deploy/rollback-versioned-release.sh"
