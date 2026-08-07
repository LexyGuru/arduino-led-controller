#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"
RELEASE_TARGET_VERSION_DEFAULT="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
RELEASE_CANDIDATE_DEFAULT="${RELEASE_TARGET_VERSION_DEFAULT#*-}-gate"
UNIT_SOURCE="${UNIT_SOURCE:-${ROOT_DIR}/deploy/systemd/arduino-led-controller-staging.service}"
UNIT_TARGET="${UNIT_TARGET:-/etc/systemd/system/arduino-led-controller-staging.service}"
ENV_SOURCE="${ENV_SOURCE:-${ROOT_DIR}/deploy/staging.env.example}"
ENV_TARGET="${ENV_TARGET:-/etc/arduino-led-controller-staging.env}"
INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${INSTALL_ROOT}/current}"
DATA_DIR="${DATA_DIR:-/var/lib/arduino-led-controller-staging}"
CONFIG_DIR="${CONFIG_DIR:-/etc/arduino-led-controller-staging}"
SCHEDULES_DIR="${SCHEDULES_DIR:-${DATA_DIR}/schedules}"
FIRMWARE_DIR="${FIRMWARE_DIR:-${DATA_DIR}/firmware}"
EVENT_ARCHIVE_DIR="${EVENT_ARCHIVE_DIR:-${DATA_DIR}/event-archive}"
RELEASE_GATE_DIR="${RELEASE_GATE_DIR:-/var/lib/arduino-led-controller/release-gates}"
RELEASE_EXECUTION_DIR="${RELEASE_EXECUTION_DIR:-/var/lib/arduino-led-controller/release-execution}"
RELEASE_ARTIFACT_DIR="${RELEASE_ARTIFACT_DIR:-${RELEASE_EXECUTION_DIR}/artifacts}"
STAGING_PORT="${STAGING_PORT:-3100}"
STAGING_BIND_HOST="${STAGING_BIND_HOST:-127.0.0.1}"
STAGING_ARDUINO_IP="${STAGING_ARDUINO_IP:-127.0.0.1}"
STAGING_ARDUINO_PORT="${STAGING_ARDUINO_PORT:-65535}"
STAGING_ARDUINO_API_PATH="${STAGING_ARDUINO_API_PATH:-/__beta8_staging_disabled__}"
STAGING_ARDUINO_API_KEY="${STAGING_ARDUINO_API_KEY:-<BETA8_STAGING_DISABLED_API_KEY>}"
ALLOW_PRODUCTION_ARDUINO="${ALLOW_PRODUCTION_ARDUINO:-0}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"

[[ "$(id -u)" -eq 0 ]] || {
  echo 'HIBA: root jogosultság szükséges.' >&2
  exit 1
}

if [[ "${STAGING_ARDUINO_IP}" == '10.0.0.123' && "${ALLOW_PRODUCTION_ARDUINO}" != '1' ]]; then
  echo 'HIBA: a produkciós Arduino-cél Beta stagingben alapból tiltott.' >&2
  echo 'Csak tudatos engedéllyel használd: ALLOW_PRODUCTION_ARDUINO=1' >&2
  exit 1
fi

for source in \
  "${UNIT_SOURCE}" \
  "${ENV_SOURCE}"; do
  [[ -f "${source}" ]] || {
    echo "HIBA: hiányzó staging telepítőfájl: ${source}" >&2
    exit 1
  }
done

install -D -m 0644 "${UNIT_SOURCE}" "${UNIT_TARGET}"

if [[ ! -f "${ENV_TARGET}" ]]; then
  install -D -m 0640 "${ENV_SOURCE}" "${ENV_TARGET}"
else
  chmod 0640 "${ENV_TARGET}"
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local temporary

  temporary="$(mktemp "${ENV_TARGET}.tmp.XXXXXX")"

  awk -v key="${key}" 'index($0, key "=") != 1 { print }' "${ENV_TARGET}" >"${temporary}"
  printf '%s=%s\n' "${key}" "${value}" >>"${temporary}"
  chmod 0640 "${temporary}"
  mv -f "${temporary}" "${ENV_TARGET}"
}

upsert_env NODE_ENV production
upsert_env PORT "${STAGING_PORT}"
upsert_env BIND_HOST "${STAGING_BIND_HOST}"
upsert_env APP_DIR "${CURRENT_LINK}"
upsert_env DATA_DIR "${DATA_DIR}"
upsert_env CONFIG_DIR "${CONFIG_DIR}"
upsert_env SCHEDULES_DIR "${SCHEDULES_DIR}"
upsert_env FIRMWARE_DIR "${FIRMWARE_DIR}"
upsert_env ARDUINO_IP "${STAGING_ARDUINO_IP}"
upsert_env ARDUINO_PORT "${STAGING_ARDUINO_PORT}"
upsert_env ARDUINO_API_PATH "${STAGING_ARDUINO_API_PATH}"
upsert_env ARDUINO_API_KEY "${STAGING_ARDUINO_API_KEY}"
upsert_env ARDUINO_TIMEOUT_MS 30000
upsert_env ARDUINO_HEALTH_TIMEOUT_MS 30000
upsert_env ARDUINO_STATUS_MONITOR_TIMEOUT_MS 30000
upsert_env ARDUINO_STATUS_MONITOR_ENABLED 0
upsert_env API_V2_ENABLED 1
upsert_env API_V2_ALLOWED_ORIGIN "http://127.0.0.1:${STAGING_PORT}"
upsert_env COOKIE_SECURE 0
upsert_env LOCAL_SCHEDULE_RUNNER_MODE manual
upsert_env LEGACY_LOCAL_SCHEDULE_ADAPTERS_ENABLED 1
upsert_env LEGACY_SUPPRESS_LOCAL_SCHEDULE_CRON 1
upsert_env LEGACY_SUPPRESS_STATUS_CRON 1
upsert_env RELEASE_CHANNEL beta
upsert_env RELEASE_CANDIDATE beta.8-gate
upsert_env RELEASE_TARGET_VERSION 5.0.0-beta.8
upsert_env RELEASE_GATE_REPORT_DIR "${RELEASE_GATE_DIR}"
upsert_env RELEASE_PROMOTION_APPROVAL_FILE "${RELEASE_GATE_DIR}/beta1-promotion-approval.json"
upsert_env RELEASE_GATE_MAX_AGE_HOURS 72
upsert_env RELEASE_EXECUTION_RECEIPT_DIR "${RELEASE_EXECUTION_DIR}"
upsert_env RELEASE_FINALIZATION_APPROVAL_FILE "${RELEASE_EXECUTION_DIR}/beta1-finalization-approval.json"
upsert_env RELEASE_EXECUTION_RECEIPT_MAX_AGE_HOURS 168
upsert_env RELEASE_ORCHESTRATION_STATE_FILE "${RELEASE_EXECUTION_DIR}/beta1-orchestration-state.json"
upsert_env RELEASE_ORCHESTRATION_ARTIFACT_DIR "${RELEASE_ARTIFACT_DIR}"
upsert_env RELEASE_ORCHESTRATION_ARTIFACT_INDEX_FILE "${RELEASE_ARTIFACT_DIR}/beta1-index.json"
upsert_env RELEASE_PRODUCTION_GUARD_FILE "${RELEASE_EXECUTION_DIR}/beta1-production-guard.json"
upsert_env RELEASE_PRODUCTION_GUARD_VERIFICATION_FILE "${RELEASE_EXECUTION_DIR}/beta1-production-guard-verification.json"
upsert_env RELEASE_ORCHESTRATION_MAX_AGE_HOURS 168

install -d -m 0755 \
  "${INSTALL_ROOT}" \
  "${RELEASES_DIR}" \
  "${DATA_DIR}" \
  "${CONFIG_DIR}" \
  "${SCHEDULES_DIR}" \
  "${FIRMWARE_DIR}" \
  "${EVENT_ARCHIVE_DIR}" \
  "${RELEASE_GATE_DIR}" \
  "${RELEASE_EXECUTION_DIR}" \
  "${RELEASE_ARTIFACT_DIR}"

RUNTIME_SETTINGS_FILE="${CONFIG_DIR}/server-settings.json"
if [[ -f "${RUNTIME_SETTINGS_FILE}" ]] && \
  command -v node >/dev/null 2>&1 && \
  node - "${RUNTIME_SETTINGS_FILE}" "${STAGING_ARDUINO_IP}" "${STAGING_ARDUINO_PORT}" <<'NODE'
const fs = require('fs');
const [file, expectedIp, expectedPortRaw] = process.argv.slice(2);
const expectedPort = Number(expectedPortRaw);
try {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ip = typeof data.arduinoIP === 'string' ? data.arduinoIP.trim() : '';
  const port = Number(data.arduinoPort);
  process.exit(
    (ip && ip !== expectedIp) ||
    (Number.isFinite(port) && port !== expectedPort)
      ? 0
      : 1
  );
} catch {
  process.exit(0);
}
NODE
then
  RUNTIME_SETTINGS_BACKUP="${CONFIG_DIR}/server-settings.pre-beta8-isolation.$(date -u +%Y%m%dT%H%M%SZ).json"
  mv "${RUNTIME_SETTINGS_FILE}" "${RUNTIME_SETTINGS_BACKUP}"
  chmod 0600 "${RUNTIME_SETTINGS_BACKUP}"
  echo "Staging runtime settings elkülönítve: ${RUNTIME_SETTINGS_BACKUP}"
fi

"${SYSTEMCTL_COMMAND}" daemon-reload
"${SYSTEMCTL_COMMAND}" enable arduino-led-controller-staging.service

echo 'A Beta.8 staging systemd szolgáltatás telepítve és összehangolva.'
echo "Környezeti fájl: ${ENV_TARGET}"
echo "Staging release könyvtár: ${RELEASES_DIR}"
echo "Staging adatkönyvtár: ${DATA_DIR}"
echo "Staging firmware könyvtár: ${FIRMWARE_DIR}"
echo "Staging Arduino-cél: ${STAGING_ARDUINO_IP}:${STAGING_ARDUINO_PORT}"
echo "Release-gate könyvtár: ${RELEASE_GATE_DIR}"
echo "Execution receipt könyvtár: ${RELEASE_EXECUTION_DIR}"
