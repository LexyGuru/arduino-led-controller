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

[[ "$(id -u)" -eq 0 ]] || {
  echo 'HIBA: root jogosultság szükséges.' >&2
  exit 1
}

install -D \
  -m 0644 \
  "${UNIT_SOURCE}" \
  "${UNIT_TARGET}"

if [[ ! -f "${ENV_TARGET}" ]]; then
  install -D \
    -m 0640 \
    "${ENV_SOURCE}" \
    "${ENV_TARGET}"
fi

install -d \
  -m 0755 \
  /opt/arduino-led-controller-staging/releases

systemctl daemon-reload
systemctl enable \
  arduino-led-controller-staging.service

echo 'A staging systemd szolgáltatás telepítve.'
echo "Környezeti fájl: ${ENV_TARGET}"
