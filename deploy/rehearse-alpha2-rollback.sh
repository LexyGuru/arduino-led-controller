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
  echo 'Használat: deploy/rehearse-alpha2-rollback.sh <staging-release.tar.gz>' >&2
  exit 2
}

INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
CURRENT_LINK="${CURRENT_LINK:-${INSTALL_ROOT}/current}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}"

case "${INSTALL_ROOT}" in
  *staging*)
    ;;
  *)
    echo "HIBA: rollback-próba csak staging útvonalon engedélyezett: ${INSTALL_ROOT}" >&2
    exit 1
    ;;
esac

[[ -L "${CURRENT_LINK}" ]] || {
  echo "HIBA: nincs aktív staging current symlink: ${CURRENT_LINK}" >&2
  exit 1
}

BEFORE="$(
  readlink "${CURRENT_LINK}"
)"

set +e

REQUIRE_RELEASE_EVIDENCE=1 \
EVIDENCE_PHASE=staging \
INSTALL_ROOT="${INSTALL_ROOT}" \
RELEASES_DIR="${RELEASES_DIR}" \
CURRENT_LINK="${CURRENT_LINK}" \
SERVICE_NAME="${SERVICE_NAME}" \
HEALTH_URL="http://127.0.0.1:1/expected-health-failure" \
HEALTH_RETRIES=2 \
HEALTH_DELAY_SECONDS=1 \
INSTALL_DEPENDENCIES=0 \
  bash \
  "${ROOT_DIR}/deploy/install-versioned-release.sh" \
  "${ARCHIVE}"

STATUS="$?"

set -e

[[ "${STATUS}" -ne 0 ]] || {
  echo 'HIBA: a szándékosan hibás health check nem állította le a telepítést.' >&2
  exit 1
}

AFTER="$(
  readlink "${CURRENT_LINK}"
)"

[[ "${AFTER}" == "${BEFORE}" ]] || {
  echo "HIBA: rollback után eltérő current symlink: ${AFTER}" >&2
  exit 1
}

echo "OK: staging rollback-próba, current változatlan: ${AFTER}"
