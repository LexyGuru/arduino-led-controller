#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
WS_URL="${WS_URL:-ws://127.0.0.1:3000/api/v1/events/ws}"

command -v curl >/dev/null || { echo "curl hiányzik" >&2; exit 1; }

json_check() {
  local url="$1"
  local name="$2"
  local tmp
  tmp="$(mktemp)"
  code="$(curl -sS --connect-timeout 5 --max-time 20 -o "$tmp" -w '%{http_code}' "$url")"
  [[ "$code" == "200" ]] || {
    echo "$name HTTP=$code"
    cat "$tmp" || true
    rm -f "$tmp"
    return 1
  }
  python3 -m json.tool "$tmp" >/dev/null
  rm -f "$tmp"
  echo "${name}=PASSED"
}

json_check "${BASE_URL}/health/live" HEALTH_LIVE
json_check "${BASE_URL}/health/ready" HEALTH_READY
json_check "${BASE_URL}/api/v1/status" STATUS_PROXY
json_check "${BASE_URL}/api/v1/schedules/status" SCHEDULE_STATUS
json_check "${BASE_URL}/api/v1/schedules?offset=0&limit=5" SCHEDULE_LIST
json_check "${BASE_URL}/api/v1/logs?afterId=0" LOGS_PROXY
json_check "${BASE_URL}/api/v1/ota/status" OTA_STATUS
json_check "${BASE_URL}/api/v1/server/firmware/catalog" FIRMWARE_CATALOG

if command -v websocat >/dev/null 2>&1; then
  EVENT="$(timeout 8 websocat -1 "$WS_URL" 2>/dev/null || true)"
  [[ -n "$EVENT" ]] || { echo "WEBSOCKET_EVENTS=FAILED" >&2; exit 1; }
  printf '%s' "$EVENT" | python3 -m json.tool >/dev/null
  echo "WEBSOCKET_EVENTS=PASSED"
else
  echo "WEBSOCKET_EVENTS=SKIPPED_WEBSOCAT_MISSING"
fi

echo "RUST_LXC_RUNTIME_SMOKE=PASSED"
