#!/usr/bin/env bash
# Biztonságos automatikus frissítés a GitHub main ágáról.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
STATE_DIR="${STATE_DIR:-/var/lib/arduino-led-controller}"
BRANCH="${UPDATE_BRANCH:-main}"
LOG_TAG="arduino-led-updater"

log() { logger -t "${LOG_TAG}" -- "$*"; echo "$*"; }

[[ -d "${APP_DIR}/.git" ]] || { log "Nincs Git munkakönyvtár: ${APP_DIR}"; exit 0; }

cd "${APP_DIR}"

# Kézzel a konténerben módosított fájlokat nem írunk felül.
if ! git -c safe.directory="${APP_DIR}" diff --quiet || ! git -c safe.directory="${APP_DIR}" diff --cached --quiet; then
  log "Frissítés kihagyva: helyi, nem mentett módosítás található."
  exit 0
fi

git -c safe.directory="${APP_DIR}" fetch --quiet origin "${BRANCH}"
REMOTE_REF="origin/${BRANCH}"

if git -c safe.directory="${APP_DIR}" merge-base --is-ancestor "${REMOTE_REF}" HEAD; then
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
git -c safe.directory="${APP_DIR}" worktree add --detach "${CHECK_DIR}" "${REMOTE_REF}" >/dev/null
node --check "${CHECK_DIR}/server2_final.js"
(cd "${CHECK_DIR}" && npm install --omit=dev --no-audit --no-fund --ignore-scripts >/dev/null)

log "Ellenőrzés sikeres; frissítés telepítése."
git -c safe.directory="${APP_DIR}" pull --ff-only origin "${BRANCH}"
install -d -o arduino-led -g arduino-led -m 0750 "${STATE_DIR}/npm-cache"
runuser -u arduino-led -- env \
  HOME="${STATE_DIR}" \
  npm_config_cache="${STATE_DIR}/npm-cache" \
  npm install --omit=dev --no-audit --no-fund
node --check server2_final.js
systemctl restart arduino-led-controller.service
log "Frissítés sikeresen befejeződött."
