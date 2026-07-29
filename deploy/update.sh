#!/usr/bin/env bash
# Biztonságos automatikus frissítés és LXC futásidejű helyreállítás.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
STATE_DIR="${STATE_DIR:-/var/lib/arduino-led-controller}"
BRANCH="${UPDATE_BRANCH:-main}"
SERVICE_NAME="arduino-led-controller"
LOG_TAG="arduino-led-updater"
MODE="${1:-update}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
HEALTH_HOST="${HEALTH_HOST:-127.0.0.1}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-3}"

log() {
  logger -t "${LOG_TAG}" -- "$*" 2>/dev/null || true
  echo "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "HIBA: a frissítőt rootként futtasd."
  exit 1
fi

command -v curl >/dev/null 2>&1 || {
  log "HIBA: a HTTP health ellenőrzéshez szükséges curl nem található."
  exit 1
}

[[ -d "${APP_DIR}" ]] || {
  log "HIBA: nincs alkalmazáskönyvtár: ${APP_DIR}"
  exit 1
}

required_runtime_files=(
  "server2_final.js"
  "server2_legacy.js"
  "server/core/lifecycle-manager.js"
  "server/core/shutdown-coordinator.js"
  "server/events/event-store.js"
  "server/observability/metrics-registry.js"
  "server/observability/audit-log.js"
  "server/observability/diagnostics-service.js"
  "server/api/v2/openapi-service.js"
  "server/api/v2/openapi-routes.js"
  "server/api/v2/user-routes.js"
  "server/api/v2/observability-routes.js"
  "docs/api/openapi-v2.json"
  "deploy/update-rollback-lib.sh"
  "server/health-bootstrap.js"
  "server/api/v2/http-error.js"
  "server/api/v2/http-response.js"
  "server/api/v2/api-v2-bootstrap.js"
  "scripts/test-health-endpoints.js"
  "scripts/test-api-v2.js"
)

for runtime_file in "${required_runtime_files[@]}"; do
  [[ -f "${APP_DIR}/${runtime_file}" ]] || {
    log "HIBA: hiányzik: ${APP_DIR}/${runtime_file}"
    exit 1
  }
done

# shellcheck source=/dev/null
source "${APP_DIR}/deploy/update-rollback-lib.sh"

[[ -x "${APP_DIR}/deploy/ensure-node-dependencies.sh" ]] ||
  chmod +x "${APP_DIR}/deploy/ensure-node-dependencies.sh"

install_runtime_units() {
  log "Systemd fájlok szinkronizálása."

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller.service" \
    "/etc/systemd/system/${SERVICE_NAME}.service"

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller-update.service" \
    "/etc/systemd/system/${SERVICE_NAME}-update.service"

  install -m 644 \
    "${APP_DIR}/deploy/arduino-led-controller-update.timer" \
    "/etc/systemd/system/${SERVICE_NAME}-update.timer"

  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}.service" >/dev/null
  systemctl enable "${SERVICE_NAME}-update.timer" >/dev/null
}

check_node_files() {
  local root_dir="$1"

  node --check "${root_dir}/server2_final.js"
  node --check "${root_dir}/server2_legacy.js"
  node --check "${root_dir}/server/core/runtime-paths.js"
  node --check "${root_dir}/server/core/config.js"
  node --check "${root_dir}/server/core/logger.js"
  node --check "${root_dir}/server/core/runtime-context.js"
  node --check "${root_dir}/server/security/roles.js"
  node --check "${root_dir}/server/security/api-token-store.js"
  node --check "${root_dir}/server/arduino/arduino-error.js"
  node --check "${root_dir}/server/arduino/arduino-client.js"
  node --check "${root_dir}/server/led/led-error.js"
  node --check "${root_dir}/server/led/led-validation.js"
  node --check "${root_dir}/server/led/led-service.js"
  node --check "${root_dir}/server/schedule/schedule-error.js"
  node --check "${root_dir}/server/schedule/schedule-validation.js"
  node --check "${root_dir}/server/schedule/schedule-codec.js"
  node --check "${root_dir}/server/schedule/schedule-service.js"
  node --check "${root_dir}/server/schedule/local-schedule-repository.js"
  node --check "${root_dir}/server/schedule/local-schedule-runner.js"
  node --check "${root_dir}/server/schedule/local-schedule-service.js"
  node --check "${root_dir}/server/firmware/firmware-error.js"
  node --check "${root_dir}/server/firmware/firmware-release-client.js"
  node --check "${root_dir}/server/firmware/ota-runner.js"
  node --check "${root_dir}/server/firmware/firmware-service.js"
  node --check "${root_dir}/server/express/express-bootstrap-registry.js"
  node --check "${root_dir}/server/health-bootstrap.js"
  node --check "${root_dir}/server/api/v2/http-error.js"
  node --check "${root_dir}/server/api/v2/http-response.js"
  node --check "${root_dir}/server/api/v2/auth.js"
  node --check "${root_dir}/server/api/v2/authorize.js"
  node --check "${root_dir}/server/api/v2/cors-security.js"
  node --check "${root_dir}/server/api/v2/readiness.js"
  node --check "${root_dir}/server/api/v2/arduino-error-mapper.js"
  node --check "${root_dir}/server/api/v2/error-handler.js"
  node --check "${root_dir}/server/api/v2/routes.js"
  node --check "${root_dir}/server/api/v2/led-routes.js"
  node --check "${root_dir}/server/api/v2/schedule-routes.js"
  node --check "${root_dir}/server/api/v2/local-schedule-routes.js"
  node --check "${root_dir}/server/api/v2/firmware-routes.js"
  node --check "${root_dir}/server/api/v2/api-v2-bootstrap.js"
  node --check "${root_dir}/scripts/test-core-modules.js"
  node --check "${root_dir}/scripts/test-arduino-client.js"
  node --check "${root_dir}/scripts/test-server-platform-modules.js"
  node --check "${root_dir}/scripts/test-led-service.js"
  node --check "${root_dir}/scripts/test-api-v2-led.js"
  node --check "${root_dir}/scripts/test-schedule-service.js"
  node --check "${root_dir}/scripts/test-api-v2-schedule.js"
  node --check "${root_dir}/scripts/test-api-token-store.js"
  node --check "${root_dir}/scripts/test-local-schedule-repository.js"
  node --check "${root_dir}/scripts/test-local-schedule-runner.js"
  node --check "${root_dir}/scripts/test-firmware-service.js"
  node --check "${root_dir}/scripts/test-api-v2-extended.js"
  node --check "${root_dir}/scripts/test-health-endpoints.js"
  node --check "${root_dir}/scripts/test-api-v2.js"
  node --check "${root_dir}/server/security/security-error.js"
  node --check "${root_dir}/server/security/user-repository.js"
  node --check "${root_dir}/server/security/session-service.js"
  node --check "${root_dir}/server/events/topics.js"
  node --check "${root_dir}/server/events/event-bus.js"
  node --check "${root_dir}/server/socket/socket-bootstrap-registry.js"
  node --check "${root_dir}/server/socket/socket-gateway.js"
  node --check "${root_dir}/server/api/v2/session-routes.js"
  node --check "${root_dir}/server/api/v2/event-routes.js"
  node --check "${root_dir}/scripts/test-session-service.js"
  node --check "${root_dir}/scripts/test-event-bus.js"
  node --check "${root_dir}/scripts/test-socket-gateway.js"
  node --check "${root_dir}/scripts/test-service-events.js"
  node --check "${root_dir}/scripts/test-api-v2-session-events.js"
  node --check "${root_dir}/server/core/lifecycle-manager.js"
  node --check "${root_dir}/server/core/shutdown-coordinator.js"
  node --check "${root_dir}/server/events/event-store.js"
  node --check "${root_dir}/server/observability/metrics-registry.js"
  node --check "${root_dir}/server/observability/audit-log.js"
  node --check "${root_dir}/server/observability/diagnostics-service.js"
  node --check "${root_dir}/server/api/v2/openapi-service.js"
  node --check "${root_dir}/server/api/v2/openapi-routes.js"
  node --check "${root_dir}/server/api/v2/user-routes.js"
  node --check "${root_dir}/server/api/v2/observability-routes.js"
  node --check "${root_dir}/scripts/test-lifecycle-manager.js"
  node --check "${root_dir}/scripts/test-metrics-registry.js"
  node --check "${root_dir}/scripts/test-event-store.js"
  node --check "${root_dir}/scripts/test-user-administration.js"
  node --check "${root_dir}/scripts/test-session-csrf.js"
  node --check "${root_dir}/scripts/test-local-schedule-update.js"
  node --check "${root_dir}/scripts/test-openapi-document.js"
  node --check "${root_dir}/scripts/test-audit-log.js"
  node --check "${root_dir}/scripts/test-alpha2-release-gate.js"
  node --check "${root_dir}/server/http/http-server-registry.js"
  node --check "${root_dir}/server/legacy/legacy-signal-guard.js"
  node --check "${root_dir}/server/legacy/legacy-response.js"
  node --check "${root_dir}/server/legacy/legacy-auth-middleware.js"
  node --check "${root_dir}/server/legacy/legacy-auth-routes.js"
  node --check "${root_dir}/server/legacy/legacy-settings-routes.js"
  node --check "${root_dir}/server/legacy/legacy-arduino-routes.js"
  node --check "${root_dir}/server/legacy/legacy-local-schedule-routes.js"
  node --check "${root_dir}/server/legacy/legacy-firmware-routes.js"
  node --check "${root_dir}/server/legacy/legacy-event-bridge.js"
  node --check "${root_dir}/server/legacy/legacy-api-bootstrap.js"
  node --check "${root_dir}/server/core/runtime-settings-service.js"
  node --check "${root_dir}/server/observability/prometheus-exporter.js"
  node --check "${root_dir}/server/api/v2/prometheus-routes.js"
  node --check "${root_dir}/server/api/v2/settings-routes.js"
  node --check "${root_dir}/scripts/test-prometheus-exporter.js"
  node --check "${root_dir}/scripts/test-runtime-settings-service.js"
  node --check "${root_dir}/scripts/test-http-server-registry.js"
  node --check "${root_dir}/scripts/test-legacy-signal-guard.js"
  node --check "${root_dir}/scripts/test-legacy-event-bridge.js"
  node --check "${root_dir}/scripts/test-legacy-adapters.js"
  node --check "${root_dir}/scripts/test-legacy-auth-local.js"
  node --check "${root_dir}/scripts/test-legacy-package-manifest.js"
  node --check "${root_dir}/server/legacy/legacy-cron-guard.js"
  node --check "${root_dir}/server/legacy/legacy-cutover-service.js"
  node --check "${root_dir}/server/legacy/legacy-schedule-file-routes.js"
  node --check "${root_dir}/server/arduino/arduino-status-monitor.js"
  node --check "${root_dir}/server/arduino/arduino-console-service.js"
  node --check "${root_dir}/server/files/file-service-error.js"
  node --check "${root_dir}/server/files/schedule-file-service.js"
  node --check "${root_dir}/server/web/static-web-installer.js"
  node --check "${root_dir}/server/api/v2/arduino-console-routes.js"
  node --check "${root_dir}/server/api/v2/schedule-file-routes.js"
  node --check "${root_dir}/server/api/v2/cutover-routes.js"
  node --check "${root_dir}/server/api/v2/web-routes.js"
  node --check "${root_dir}/scripts/test-legacy-cron-guard.js"
  node --check "${root_dir}/scripts/test-arduino-status-monitor.js"
  node --check "${root_dir}/scripts/test-arduino-console-service.js"
  node --check "${root_dir}/scripts/test-schedule-file-service.js"
  node --check "${root_dir}/scripts/test-cutover-service.js"
  node --check "${root_dir}/scripts/test-static-web-installer.js"
  node --check "${root_dir}/scripts/test-cutover-package-manifest.js"
  node --check "${root_dir}/server/security/api-token-repository.js"
  node --check "${root_dir}/server/security/api-token-service.js"
  node --check "${root_dir}/server/api/v2/token-routes.js"
  node --check "${root_dir}/server/firmware/firmware-backup-store.js"
  node --check "${root_dir}/scripts/generate-openapi-typescript.js"
  node --check "${root_dir}/scripts/test-api-token-administration.js"
  node --check "${root_dir}/scripts/test-firmware-backup-rollback.js"
  node --check "${root_dir}/scripts/test-ota-cancellation.js"
  node --check "${root_dir}/scripts/test-openapi-typescript-generator.js"
  node --check "${root_dir}/scripts/test-alpha2-candidate-tooling.js"
  node --check "${root_dir}/scripts/test-alpha2-candidate-package-manifest.js"
}

repair_runtime() {
  local force_arg="${1:-}"

  install -d \
    -o arduino-led \
    -g arduino-led \
    -m 0750 \
    "${STATE_DIR}" \
    "${STATE_DIR}/npm-cache"

  if [[ "${force_arg}" == "--force" ]]; then
    APP_DIR="${APP_DIR}" \
    STATE_DIR="${STATE_DIR}" \
      bash "${APP_DIR}/deploy/ensure-node-dependencies.sh" --force
  else
    APP_DIR="${APP_DIR}" \
    STATE_DIR="${STATE_DIR}" \
      bash "${APP_DIR}/deploy/ensure-node-dependencies.sh"
  fi

  check_node_files "${APP_DIR}"
}

read_health_port() {
  local port="${PORT:-}"

  if [[ -z "${port}" && -r "${ENV_FILE}" ]]; then
    port="$(
      sed -n \
        's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*//p' \
        "${ENV_FILE}" |
        tail -n 1 |
        sed 's/[[:space:]]*#.*$//' |
        tr -d "\"'" |
        tr -d '[:space:]'
    )"
  fi

  port="${port:-3000}"

  if [[ ! "${port}" =~ ^[0-9]+$ ]] ||
     (( port < 1 || port > 65535 )); then
    log "HIBA: érvénytelen health check port: ${port}"
    return 1
  fi

  printf '%s\n' "${port}"
}

HEALTH_PORT="$(read_health_port)"
HEALTH_BASE_URL="http://${HEALTH_HOST}:${HEALTH_PORT}"

health_live() {
  curl \
    --fail \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/live" \
    >/dev/null 2>&1
}

health_ready() {
  curl \
    --fail \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/ready" \
    >/dev/null 2>&1
}

print_health_diagnostics() {
  log "Live health válasz:"

  curl \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/live" \
    >&2 || true

  echo >&2
  log "Ready health válasz:"

  curl \
    --silent \
    --show-error \
    --max-time "${HEALTH_TIMEOUT_SECONDS}" \
    "${HEALTH_BASE_URL}/health/ready" \
    >&2 || true

  echo >&2
}

restart_and_verify() {
  log "Szolgáltatás újraindítása."

  systemctl reset-failed \
    "${SERVICE_NAME}.service" \
    >/dev/null 2>&1 || true

  systemctl restart "${SERVICE_NAME}.service"

  for _ in {1..45}; do
    if systemctl is-failed --quiet "${SERVICE_NAME}.service"; then
      break
    fi

    if systemctl is-active --quiet "${SERVICE_NAME}.service" &&
       health_live &&
       health_ready; then
      log "A szolgáltatás aktív, a live és ready health ellenőrzés sikeres."
      return 0
    fi

    sleep 1
  done

  log "HIBA: a szolgáltatás nem került működő és kész állapotba."
  print_health_diagnostics

  journalctl \
    -u "${SERVICE_NAME}.service" \
    -n 60 \
    --no-pager \
    >&2 || true

  return 1
}

record_current_as_good() {
  local commit="$1"

  write_last_known_good \
    "${STATE_DIR}" \
    "${commit}" ||
    log "FIGYELEM: a last-known-good commit nem menthető: ${commit}"
}

deploy_candidate_update() {
  git -c safe.directory="${APP_DIR}" \
    pull --ff-only origin "${BRANCH}" ||
    return 1

  chmod +x "${APP_DIR}/deploy/"*.sh ||
    return 1

  chmod +x "${APP_DIR}/scripts/"*.sh \
    2>/dev/null || true

  install_runtime_units ||
    return 1

  repair_runtime ||
    return 1

  restart_and_verify ||
    return 1

  systemctl enable --now \
    "${SERVICE_NAME}-update.timer" \
    >/dev/null ||
    return 1
}

rollback_failed_update() {
  local previous_commit="$1"

  log "A hibás frissítés visszaállítása erre a commitra: ${previous_commit}"

  systemctl stop \
    "${SERVICE_NAME}.service" \
    >/dev/null 2>&1 || true

  rollback_repository \
    "${APP_DIR}" \
    "${previous_commit}" ||
    return 1

  chmod +x "${APP_DIR}/deploy/"*.sh ||
    return 1

  chmod +x "${APP_DIR}/scripts/"*.sh \
    2>/dev/null || true

  install_runtime_units ||
    return 1

  install -d \
    -o arduino-led \
    -g arduino-led \
    -m 0750 \
    "${STATE_DIR}" \
    "${STATE_DIR}/npm-cache" ||
    return 1

  APP_DIR="${APP_DIR}" \
  STATE_DIR="${STATE_DIR}" \
    bash "${APP_DIR}/deploy/ensure-node-dependencies.sh" --force ||
    return 1

  node --check \
    "${APP_DIR}/server2_final.js" ||
    return 1

  node --check \
    "${APP_DIR}/server2_legacy.js" ||
    return 1

  restart_and_verify ||
    return 1

  record_current_as_good \
    "${previous_commit}"

  return 0
}

cd "${APP_DIR}"

if [[ "${MODE}" == "--repair" || "${MODE}" == "repair" ]]; then
  log "Kényszerített LXC futásidejű javítás."
  install_runtime_units

  log "A szolgáltatás leállítása a tiszta függőségtelepítéshez."
  systemctl stop "${SERVICE_NAME}.service" >/dev/null 2>&1 || true

  repair_runtime --force
  restart_and_verify

  systemctl enable --now \
    "${SERVICE_NAME}-update.timer" \
    >/dev/null

  log "A javítás sikeresen befejeződött."
  exit 0
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Nincs Git munkakönyvtár; csak a futásidejű környezetet javítom."
  install_runtime_units
  repair_runtime
  restart_and_verify
  exit 0
fi

# Kézzel módosított követett fájlokat nem írunk felül.
if ! git -c safe.directory="${APP_DIR}" diff --quiet ||
   ! git -c safe.directory="${APP_DIR}" diff --cached --quiet; then
  log "Frissítés kihagyva: helyi, nem mentett módosítás található."
  install_runtime_units
  repair_runtime
  restart_and_verify
  exit 0
fi

git -c safe.directory="${APP_DIR}" \
  fetch --quiet origin "${BRANCH}"

REMOTE_REF="origin/${BRANCH}"
LOCAL_HEAD="$(
  git -c safe.directory="${APP_DIR}" rev-parse HEAD
)"
REMOTE_HEAD="$(
  git -c safe.directory="${APP_DIR}" rev-parse "${REMOTE_REF}"
)"

if [[ "${LOCAL_HEAD}" == "${REMOTE_HEAD}" ]]; then
  log "Nincs új GitHub-frissítés; függőség-, service- és health-ellenőrzés következik."

  install_runtime_units
  repair_runtime

  if ! systemctl is-active --quiet "${SERVICE_NAME}.service" ||
     ! health_live ||
     ! health_ready; then
    log "A szolgáltatás vagy a health állapot hibás; újraindítás következik."
    restart_and_verify
  else
    log "A szolgáltatás és a health ellenőrzések rendben vannak."
  fi

  record_current_as_good \
    "${LOCAL_HEAD}"

  exit 0
fi

if ! git -c safe.directory="${APP_DIR}" \
  merge-base --is-ancestor HEAD "${REMOTE_REF}"; then
  log "HIBA: a helyi és távoli ág eltért; automatikus fast-forward nem biztonságos."
  exit 1
fi

CHECK_DIR="$(mktemp -d /tmp/arduino-led-update.XXXXXX)"

cleanup() {
  git -c safe.directory="${APP_DIR}" \
    worktree remove --force "${CHECK_DIR}" \
    >/dev/null 2>&1 || true

  rm -rf "${CHECK_DIR}"
}

trap cleanup EXIT

log "Új verzió található; ellenőrzés külön munkakönyvtárban."

git -c safe.directory="${APP_DIR}" \
  worktree add --detach "${CHECK_DIR}" "${REMOTE_REF}" \
  >/dev/null

check_node_files "${CHECK_DIR}"

(
  cd "${CHECK_DIR}"

  if [[ -f package-lock.json ]]; then
    npm ci \
      --omit=dev \
      --no-audit \
      --no-fund \
      --ignore-scripts \
      >/dev/null
  else
    npm install \
      --omit=dev \
      --no-audit \
      --no-fund \
      --ignore-scripts \
      --package-lock=false \
      >/dev/null
  fi

  node -e \
    "require.resolve('express'); require.resolve('socket.io'); require.resolve('axios')"

  npm test --silent
)

log "Ellenőrzés sikeres; frissítés telepítése."

PREVIOUS_HEAD="${LOCAL_HEAD}"

if deploy_candidate_update; then
  INSTALLED_HEAD="$(
    git -c safe.directory="${APP_DIR}" \
      rev-parse HEAD
  )"

  record_current_as_good \
    "${INSTALLED_HEAD}"

  log "Frissítés sikeresen befejeződött: ${INSTALLED_HEAD}"
  exit 0
else
  UPDATE_STATUS="$?"
fi

log "HIBA: a frissített verzió telepítése vagy health ellenőrzése sikertelen."

if rollback_failed_update \
  "${PREVIOUS_HEAD}"; then
  log "ROLLBACK SIKERES: a korábbi működő verzió helyreállt: ${PREVIOUS_HEAD}"
  exit "${UPDATE_STATUS}"
fi

log "KRITIKUS HIBA: az automatikus rollback sem sikerült."

journalctl \
  -u "${SERVICE_NAME}.service" \
  -n 100 \
  --no-pager \
  >&2 || true

exit 1
