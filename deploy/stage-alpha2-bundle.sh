#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"

ARCHIVE="${1:-}"

[[ -n "${ARCHIVE}" ]] || {
  echo 'Használat: deploy/stage-alpha2-bundle.sh <release.tar.gz>' >&2
  exit 2
}

INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${INSTALL_ROOT}/current}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100/health/ready}"
STAGING_ENV_FILE="${STAGING_ENV_FILE:-${ENV_TARGET:-/etc/arduino-led-controller-staging.env}}"

# Nem csak az első staging telepítéskor kell futnia. Így egy már létező
# systemd unit és env is megkapja az új izolációs alapértékeket és a kötelező
# runtime könyvtárakat a candidate bundle aktiválása előtt.
if [[ "${AUTO_INSTALL_STAGING_SERVICE:-1}" == '1' ]]; then
  ENV_TARGET="${STAGING_ENV_FILE}" \
  INSTALL_ROOT="${INSTALL_ROOT}" \
  RELEASES_DIR="${RELEASES_DIR}" \
  CURRENT_LINK="${CURRENT_LINK}" \
    bash \
    "${ROOT_DIR}/deploy/install-staging-service.sh"
fi

PHASE=staging \
  bash \
  "${ROOT_DIR}/deploy/verify-alpha2-release-bundle.sh" \
  "${ARCHIVE}"

REQUIRE_RELEASE_EVIDENCE=1 \
EVIDENCE_PHASE=staging \
INSTALL_ROOT="${INSTALL_ROOT}" \
RELEASES_DIR="${RELEASES_DIR}" \
CURRENT_LINK="${CURRENT_LINK}" \
SERVICE_NAME="${SERVICE_NAME}" \
HEALTH_URL="${HEALTH_URL}" \
  bash \
  "${ROOT_DIR}/deploy/install-versioned-release.sh" \
  "${ARCHIVE}"

RECEIPT_DIR="${RECEIPT_DIR:-/var/lib/arduino-led-controller/release-execution}"
node \
  "${ROOT_DIR}/scripts/write-alpha2-execution-receipt.js" \
  --kind staging-deployment \
  --metadata "${CURRENT_LINK}/RELEASE-METADATA.json" \
  --evidence "${CURRENT_LINK}/release-evidence/RELEASE-EVIDENCE.json" \
  --output "${RECEIPT_DIR}/staging-deployment.json" \
  --service "${SERVICE_NAME}" \
  --health-url "${HEALTH_URL}" \
  --current-release "$(
    readlink "${CURRENT_LINK}"
  )"
