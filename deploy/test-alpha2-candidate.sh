#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
CANDIDATE_REF="${CANDIDATE_REF:-HEAD}"
NPM_CACHE_DIR="${NPM_CACHE_DIR:-/var/cache/arduino-led-controller-alpha2}"
TEST_ROOT=""
CHILD_PID=""

log() {
  printf '[alpha2-gate] %s\n' "$*"
}

cleanup() {
  local exit_code=$?

  if [[ -n "${CHILD_PID}" ]]; then
    kill "${CHILD_PID}" >/dev/null 2>&1 || true
    wait "${CHILD_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${TEST_ROOT}" && -d "${TEST_ROOT}" ]]; then
    git -C "${APP_DIR}" \
      worktree remove \
      --force \
      "${TEST_ROOT}" \
      >/dev/null 2>&1 || true

    rm -rf "${TEST_ROOT}"
  fi

  exit "${exit_code}"
}

trap cleanup EXIT INT TERM

[[ -d "${APP_DIR}/.git" ]] || {
  log "HIBA: nem Git repository: ${APP_DIR}"
  exit 1
}

command -v node >/dev/null 2>&1 || {
  log "HIBA: Node.js nem található."
  exit 1
}

command -v npm >/dev/null 2>&1 || {
  log "HIBA: npm nem található."
  exit 1
}

command -v curl >/dev/null 2>&1 || {
  log "HIBA: curl nem található."
  exit 1
}

if [[ -r "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
fi

TEST_TOKEN="${API_V2_TOKEN:-}"

if [[ -z "${TEST_TOKEN}" && -n "${API_V2_TOKENS_JSON:-}" ]]; then
  TEST_TOKEN="$(
    API_V2_TOKENS_JSON="${API_V2_TOKENS_JSON}" \
      node -e '
        const entries = JSON.parse(process.env.API_V2_TOKENS_JSON || "[]");
        const active = entries.find((entry) => entry && entry.enabled !== false && typeof entry.token === "string");
        process.stdout.write(active ? active.token : "");
      '
  )"
fi

[[ -n "${TEST_TOKEN}" ]] || {
  log "HIBA: az API v2 teszthez API_V2_TOKEN vagy aktív API_V2_TOKENS_JSON szükséges."
  exit 1
}

[[ -n "${ARDUINO_API_PATH:-}" && -n "${ARDUINO_API_KEY:-}" ]] || {
  log "HIBA: ARDUINO_API_PATH és ARDUINO_API_KEY szükséges."
  exit 1
}

TEST_ROOT="$(
  mktemp \
    -d \
    /var/tmp/arduino-led-alpha2.XXXXXX
)"

log "Izolált worktree létrehozása: ${CANDIDATE_REF}"

git -C "${APP_DIR}" \
  worktree add \
  --detach \
  "${TEST_ROOT}" \
  "${CANDIDATE_REF}"

install -d \
  -m 0750 \
  "${NPM_CACHE_DIR}"

log "Zárolt Node-függőségek telepítése."

(
  cd "${TEST_ROOT}"

  npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --cache "${NPM_CACHE_DIR}"
)

log "Repository-validátor futtatása."

(
  cd "${TEST_ROOT}"
  bash scripts/validate-repository.sh
)

TEST_PORT="$(
  node -e '
    const net = require("net");
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => process.stdout.write(String(port)));
    });
  '
)"

DATA_DIR="${TEST_ROOT}/.alpha2-test/data"
CONFIG_DIR="${TEST_ROOT}/.alpha2-test/config"
SCHEDULES_DIR="${TEST_ROOT}/.alpha2-test/schedules"
FIRMWARE_DIR="${TEST_ROOT}/.alpha2-test/firmware"
AUTH_FILE="${CONFIG_DIR}/users.json"

mkdir -p \
  "${DATA_DIR}" \
  "${CONFIG_DIR}" \
  "${SCHEDULES_DIR}" \
  "${FIRMWARE_DIR}"

log "Izolált szerver indítása a ${TEST_PORT} porton."

(
  cd "${TEST_ROOT}"

  NODE_ENV=test \
  LOG_LEVEL=error \
  PORT="${TEST_PORT}" \
  BIND_HOST=127.0.0.1 \
  DATA_DIR="${DATA_DIR}" \
  CONFIG_DIR="${CONFIG_DIR}" \
  SCHEDULES_DIR="${SCHEDULES_DIR}" \
  FIRMWARE_DIR="${FIRMWARE_DIR}" \
  AUTH_FILE="${AUTH_FILE}" \
  LOCAL_SCHEDULE_RUNNER_MODE=manual \
  node server2_final.js
) >"${TEST_ROOT}/.alpha2-test/server.log" 2>&1 &

CHILD_PID=$!

BASE_URL="http://127.0.0.1:${TEST_PORT}"

for _ in {1..60}; do
  if ! kill -0 "${CHILD_PID}" >/dev/null 2>&1; then
    log "HIBA: az izolált szerver leállt."
    cat "${TEST_ROOT}/.alpha2-test/server.log" >&2
    exit 1
  fi

  if curl \
    --fail \
    --silent \
    --max-time 2 \
    "${BASE_URL}/health/live" \
    >/dev/null &&
    curl \
      --fail \
      --silent \
      --max-time 2 \
      "${BASE_URL}/health/ready" \
      >/dev/null; then
    break
  fi

  sleep 1
done

curl \
  --fail \
  --silent \
  --max-time 3 \
  "${BASE_URL}/health/live" \
  >/dev/null

curl \
  --fail \
  --silent \
  --max-time 3 \
  "${BASE_URL}/health/ready" \
  >/dev/null

curl \
  --fail \
  --silent \
  --max-time 3 \
  "${BASE_URL}/api/v2/openapi.json" \
  | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => input += chunk);
      process.stdin.on("end", () => {
        const document = JSON.parse(input);
        if (document.openapi !== "3.1.0") process.exit(1);
        if (Object.keys(document.paths || {}).length < 40) process.exit(1);
      });
    '

curl \
  --fail \
  --silent \
  --max-time 3 \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  "${BASE_URL}/api/v2/system/status" \
  | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => input += chunk);
      process.stdin.on("end", () => {
        const body = JSON.parse(input);
        if (body.success !== true) process.exit(1);
        if (body.data?.lifecycle?.state !== "ready") process.exit(1);
      });
    '

log "Rollback könyvtárteszt."

(
  cd "${TEST_ROOT}"
  bash scripts/test-update-rollback.sh
)

log "Az alpha.2 izolált release gate sikeres."
