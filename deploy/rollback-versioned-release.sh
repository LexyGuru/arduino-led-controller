#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${INSTALL_ROOT}/current}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100/health/ready}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"
CURL_COMMAND="${CURL_COMMAND:-curl}"
TARGET="${1:-}"

log() {
  printf '[release-rollback] %s\n' "$*"
}

[[ -d "${RELEASES_DIR}" ]] || {
  log "HIBA: nincs releases könyvtár: ${RELEASES_DIR}"
  exit 1
}

if [[ -z "${TARGET}" ]]; then
  TARGET="$(
    find "${RELEASES_DIR}" \
      -mindepth 1 \
      -maxdepth 1 \
      -type d \
      -printf '%T@ %p\n' |
    sort -rn |
    awk -v current="$(
      readlink "${CURRENT_LINK}" 2>/dev/null ||
      true
    )" '
      $2 != current {
        print $2;
        exit
      }
    '
  )"
elif [[ "${TARGET}" != /* ]]; then
  TARGET="${RELEASES_DIR}/${TARGET}"
fi

[[ -n "${TARGET}" && -d "${TARGET}" ]] || {
  log 'HIBA: nem található visszaállítható release.'
  exit 1
}

PREVIOUS="$(
  readlink "${CURRENT_LINK}" 2>/dev/null ||
  true
)"

ln -sfn \
  "${TARGET}" \
  "${CURRENT_LINK}"

rollback_failed() {
  if [[ -n "${PREVIOUS}" ]]; then
    ln -sfn \
      "${PREVIOUS}" \
      "${CURRENT_LINK}"

    "${SYSTEMCTL_COMMAND}" \
      restart \
      "${SERVICE_NAME}" ||
      true
  fi
}

trap rollback_failed ERR

"${SYSTEMCTL_COMMAND}" \
  restart \
  "${SERVICE_NAME}"

for attempt in $(seq 1 30); do
  if "${CURL_COMMAND}" \
    -fsS \
    --max-time 3 \
    "${HEALTH_URL}" \
    >/dev/null; then
    trap - ERR
    log "Rollback sikeres: ${TARGET}"
    exit 0
  fi

  sleep 2
done

log 'HIBA: a rollback release nem lett ready állapotú.'
exit 1
