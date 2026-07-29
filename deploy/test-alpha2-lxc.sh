#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
CANDIDATE_REF="${CANDIDATE_REF:-HEAD}"
STATE_DIR="${STATE_DIR:-/var/lib/arduino-led-controller}"
REPORT_DIR="${REPORT_DIR:-${STATE_DIR}/release-gates}"
REPORT_FILE="${REPORT_FILE:-${REPORT_DIR}/alpha2-$(date -u +%Y%m%dT%H%M%SZ).json}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BASELINE_COMMIT=""
CANDIDATE_COMMIT=""
STATUS="failed"

log() {
  printf '[alpha2-lxc] %s\n' "$*"
}

write_report() {
  local finished_at
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  install -d -m 0750 "${REPORT_DIR}"

  node - \
    "${REPORT_FILE}" \
    "${STARTED_AT}" \
    "${finished_at}" \
    "${STATUS}" \
    "${BASELINE_COMMIT}" \
    "${CANDIDATE_COMMIT}" \
    "${SERVICE_NAME}" \
    "${CANDIDATE_REF}" \
    <<'NODE'
const fs = require('fs');
const [
  file,
  startedAt,
  finishedAt,
  status,
  baselineCommit,
  candidateCommit,
  serviceName,
  candidateRef
] = process.argv.slice(2);

fs.writeFileSync(
  file,
  `${JSON.stringify({
    schemaVersion: 1,
    gate: 'alpha2-lxc',
    startedAt,
    finishedAt,
    status,
    baselineCommit,
    candidateCommit,
    serviceName,
    candidateRef,
    hostname: require('os').hostname(),
    nodeVersion: process.version
  }, null, 2)}\n`,
  { mode: 0o640 }
);
NODE

  log "Jelentés: ${REPORT_FILE}"
}

trap write_report EXIT

[[ "$(id -u)" -eq 0 ]] || {
  log 'HIBA: a valódi LXC gate root jogosultságot igényel.'
  exit 1
}

[[ -d "${APP_DIR}/.git" ]] || {
  log "HIBA: nem Git repository: ${APP_DIR}"
  exit 1
}

for command in git node npm curl systemctl; do
  command -v "${command}" >/dev/null 2>&1 || {
    log "HIBA: hiányzó parancs: ${command}"
    exit 1
  }
done

BASELINE_COMMIT="$(git -C "${APP_DIR}" rev-parse HEAD)"
CANDIDATE_COMMIT="$(git -C "${APP_DIR}" rev-parse "${CANDIDATE_REF}^{commit}")"

log "Produkciós baseline: ${BASELINE_COMMIT}"
log "Candidate commit: ${CANDIDATE_COMMIT}"

systemctl is-active --quiet "${SERVICE_NAME}" || {
  log "HIBA: a produkciós szolgáltatás nem aktív: ${SERVICE_NAME}"
  exit 1
}

log 'Izolált worktree + endpoint gate.'
APP_DIR="${APP_DIR}" \
ENV_FILE="${ENV_FILE}" \
CANDIDATE_REF="${CANDIDATE_COMMIT}" \
  bash "${APP_DIR}/deploy/test-alpha2-candidate.sh"

log 'Rollback könyvtár- és Git-teszt.'
(
  cd "${APP_DIR}"
  bash scripts/test-update-rollback.sh
)

log 'Produkciós szolgáltatás állapotának utóellenőrzése.'
systemctl is-active --quiet "${SERVICE_NAME}"

STATUS="passed"
log 'A valódi LXC alpha.2 release-gate sikeres.'
