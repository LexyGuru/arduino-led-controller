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

PHASE=staging \
  bash \
  "${ROOT_DIR}/deploy/verify-alpha2-release-bundle.sh" \
  "${ARCHIVE}"

REQUIRE_RELEASE_EVIDENCE=1 \
EVIDENCE_PHASE=staging \
INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}" \
RELEASES_DIR="${RELEASES_DIR:-/opt/arduino-led-controller-staging/releases}" \
CURRENT_LINK="${CURRENT_LINK:-/opt/arduino-led-controller-staging/current}" \
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}" \
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100/health/ready}" \
  bash \
  "${ROOT_DIR}/deploy/install-versioned-release.sh" \
  "${ARCHIVE}"


RECEIPT_DIR="${RECEIPT_DIR:-/var/lib/arduino-led-controller/release-execution}"
CURRENT_LINK="${CURRENT_LINK:-/opt/arduino-led-controller-staging/current}"

node \
  "${ROOT_DIR}/scripts/write-alpha2-execution-receipt.js" \
  --kind staging-deployment \
  --metadata "${CURRENT_LINK}/RELEASE-METADATA.json" \
  --evidence "${CURRENT_LINK}/release-evidence/RELEASE-EVIDENCE.json" \
  --output "${RECEIPT_DIR}/staging-deployment.json" \
  --service "${SERVICE_NAME:-arduino-led-controller-staging}" \
  --health-url "${HEALTH_URL:-http://127.0.0.1:3100/health/ready}" \
  --current-release "$(
    readlink "${CURRENT_LINK}"
  )"
