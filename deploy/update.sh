#!/usr/bin/env bash
# Biztonságos automatikus frissítés a GitHub main ágáról.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
BRANCH="${UPDATE_BRANCH:-main}"
LOG_TAG="arduino-led-updater"

log() { logger -t "${LOG_TAG}" -- "$*"; echo "$*"; }

[[ -d "${APP_DIR}/.git" ]] || { log "Nincs Git munkakönyvtár: ${APP_DIR}"; exit 0; }

cd "${APP_DIR}"

# Kézzel a konténerben módosított fájlokat nem írunk felül.
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "Frissítés kihagyva: helyi, nem mentett módosítás található."
  exit 0
fi

git fetch --quiet origin "${BRANCH}"
REMOTE_REF="origin/${BRANCH}"

if git merge-base --is-ancestor "${REMOTE_REF}" HEAD; then
  log "Nincs új GitHub-frissítés."
  exit 0
fi

CHECK_DIR="$(mktemp -d /tmp/arduino-led-update.XXXXXX)"
cleanup() {
  git worktree remove --force "${CHECK_DIR}" >/dev/null 2>&1 || true
  rm -rf "${CHECK_DIR}"
}
trap cleanup EXIT

log "Új verzió található; ellenőrzés külön munkakönyvtárban."
git worktree add --detach "${CHECK_DIR}" "${REMOTE_REF}" >/dev/null
node --check "${CHECK_DIR}/server2_final.js"
(cd "${CHECK_DIR}" && npm install --omit=dev --no-audit --no-fund --ignore-scripts >/dev/null)

log "Ellenőrzés sikeres; frissítés telepítése."
git pull --ff-only origin "${BRANCH}"
runuser -u arduino-led -- npm install --omit=dev --no-audit --no-fund
node --check server2_final.js
systemctl restart arduino-led-controller.service
log "Frissítés sikeresen befejeződött."
