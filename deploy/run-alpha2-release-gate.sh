#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
CANDIDATE_REF="${CANDIDATE_REF:-origin/feature/v5-server-modularization}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
REPORT_DIR="${REPORT_DIR:-/var/lib/arduino-led-controller/release-gates}"
FETCH_REMOTE="${FETCH_REMOTE:-origin}"

log() {
  printf '[alpha2-gate-runner] %s\n' "$*"
}

[[ "$(id -u)" -eq 0 ]] || {
  log 'HIBA: root jogosultság szükséges.'
  exit 1
}

[[ -e "${APP_DIR}/.git" ]] || {
  log "HIBA: nem Git repository: ${APP_DIR}"
  exit 1
}

for command in git node npm curl systemctl; do
  command -v "${command}" >/dev/null 2>&1 || {
    log "HIBA: hiányzó parancs: ${command}"
    exit 1
  }
done

log "Git fetch: ${FETCH_REMOTE}"
git -C "${APP_DIR}" fetch \
  --prune \
  "${FETCH_REMOTE}"

CANDIDATE_COMMIT="$(
  git -C "${APP_DIR}" \
    rev-parse \
    "${CANDIDATE_REF}^{commit}"
)"

WORKTREE="$(
  mktemp -d \
    /tmp/arduino-led-alpha2-gate.XXXXXX
)"

cleanup() {
  git -C "${APP_DIR}" \
    worktree remove \
    --force \
    "${WORKTREE}" \
    >/dev/null 2>&1 ||
    true

  rm -rf "${WORKTREE}"
}

trap cleanup EXIT

log "Candidate worktree: ${CANDIDATE_COMMIT}"
git -C "${APP_DIR}" \
  worktree add \
  --detach \
  "${WORKTREE}" \
  "${CANDIDATE_COMMIT}"

chmod +x \
  "${WORKTREE}/deploy/test-alpha2-lxc.sh" \
  "${WORKTREE}/deploy/test-alpha2-candidate.sh"

APP_DIR="${APP_DIR}" \
ENV_FILE="${ENV_FILE}" \
SERVICE_NAME="${SERVICE_NAME}" \
CANDIDATE_REF="${CANDIDATE_COMMIT}" \
CANDIDATE_SCRIPT="${WORKTREE}/deploy/test-alpha2-candidate.sh" \
REPORT_DIR="${REPORT_DIR}" \
  bash \
  "${WORKTREE}/deploy/test-alpha2-lxc.sh"

REPORT_FILE="$(
  find "${REPORT_DIR}" \
    -maxdepth 1 \
    -type f \
    -name 'alpha2-*.json' \
    -print0 |
  xargs -0 ls -1t |
  head -n 1
)"

[[ -n "${REPORT_FILE}" ]] || {
  log 'HIBA: nem készült release-gate jelentés.'
  exit 1
}

node \
  "${WORKTREE}/scripts/verify-release-gate-report.js" \
  --root "${WORKTREE}" \
  --report "${REPORT_FILE}" \
  --expected-commit "${CANDIDATE_COMMIT}"

log "Sikeres alpha.2 release-gate: ${REPORT_FILE}"
