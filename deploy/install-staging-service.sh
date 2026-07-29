#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"

UNIT_SOURCE="${UNIT_SOURCE:-${ROOT_DIR}/deploy/systemd/arduino-led-controller-staging.service}"
UNIT_TARGET="${UNIT_TARGET:-/etc/systemd/system/arduino-led-controller-staging.service}"
ENV_SOURCE="${ENV_SOURCE:-${ROOT_DIR}/deploy/staging.env.example}"
ENV_TARGET="${ENV_TARGET:-/etc/arduino-led-controller-staging.env}"

INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
DATA_DIR="${DATA_DIR:-/var/lib/arduino-led-controller-staging}"
CONFIG_DIR="${CONFIG_DIR:-/etc/arduino-led-controller-staging}"
SCHEDULES_DIR="${SCHEDULES_DIR:-${DATA_DIR}/schedules}"
RELEASE_GATE_DIR="${RELEASE_GATE_DIR:-/var/lib/arduino-led-controller/release-gates}"
RELEASE_EXECUTION_DIR="${RELEASE_EXECUTION_DIR:-/var/lib/arduino-led-controller/release-execution}"
RELEASE_ARTIFACT_DIR="${RELEASE_ARTIFACT_DIR:-${RELEASE_EXECUTION_DIR}/artifacts}"

[[ "$(id -u)" -eq 0 ]] || {
  echo 'HIBA: root jogosultság szükséges.' >&2
  exit 1
}

for source in \
  "${UNIT_SOURCE}" \
  "${ENV_SOURCE}"; do
  [[ -f "${source}" ]] || {
    echo "HIBA: hiányzó staging telepítőfájl: ${source}" >&2
    exit 1
  }
done

install -D \
  -m 0644 \
  "${UNIT_SOURCE}" \
  "${UNIT_TARGET}"

if [[ ! -f "${ENV_TARGET}" ]]; then
  install -D \
    -m 0640 \
    "${ENV_SOURCE}" \
    "${ENV_TARGET}"
else
  chmod 0640 \
    "${ENV_TARGET}"
fi

install -d \
  -m 0755 \
  "${INSTALL_ROOT}" \
  "${RELEASES_DIR}" \
  "${DATA_DIR}" \
  "${CONFIG_DIR}" \
  "${SCHEDULES_DIR}" \
  "${RELEASE_GATE_DIR}" \
  "${RELEASE_EXECUTION_DIR}" \
  "${RELEASE_ARTIFACT_DIR}"

systemctl daemon-reload

systemctl enable \
  arduino-led-controller-staging.service

echo 'A staging systemd szolgáltatás telepítve.'
echo "Környezeti fájl: ${ENV_TARGET}"
echo "Staging release könyvtár: ${RELEASES_DIR}"
echo "Staging adatkönyvtár: ${DATA_DIR}"
echo "Release-gate könyvtár: ${RELEASE_GATE_DIR}"
echo "Execution receipt könyvtár: ${RELEASE_EXECUTION_DIR}"
