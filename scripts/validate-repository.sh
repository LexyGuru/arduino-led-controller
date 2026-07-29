#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[1/6] Verziók ellenőrzése"
python3 scripts/check-versions.py

echo
echo "[2/6] Node.js szintaktikai ellenőrzés"
npm run check --silent

echo
echo "[3/6] Bash scriptek szintaktikai ellenőrzése"
while IFS= read -r -d '' script; do
  bash -n "${script}"
done < <(find deploy scripts -type f -name '*.sh' -print0)

echo
echo "[4/6] Kötelező fájlok ellenőrzése"
required_files=(
  "VERSION"
  ".editorconfig"
  ".env.example"
  "package.json"
  "package-lock.json"
  "server2_final.js"
  "server2_legacy.js"
  "server/core/runtime-paths.js"
  "server/core/config.js"
  "server/core/logger.js"
  "server/core/runtime-context.js"
  "server/security/roles.js"
  "server/security/api-token-store.js"
  "server/security/security-error.js"
  "server/security/user-repository.js"
  "server/security/session-service.js"
  "server/events/topics.js"
  "server/events/event-bus.js"
  "server/socket/socket-bootstrap-registry.js"
  "server/socket/socket-gateway.js"
  "server/arduino/arduino-error.js"
  "server/arduino/arduino-client.js"
  "server/led/led-error.js"
  "server/led/led-validation.js"
  "server/led/led-service.js"
  "server/schedule/schedule-error.js"
  "server/schedule/schedule-validation.js"
  "server/schedule/schedule-codec.js"
  "server/schedule/schedule-service.js"
  "server/schedule/local-schedule-repository.js"
  "server/schedule/local-schedule-runner.js"
  "server/schedule/local-schedule-service.js"
  "server/firmware/firmware-error.js"
  "server/firmware/firmware-release-client.js"
  "server/firmware/ota-runner.js"
  "server/firmware/firmware-service.js"
  "server/express/express-bootstrap-registry.js"
  "server/health-bootstrap.js"
  "server/api/v2/http-error.js"
  "server/api/v2/http-response.js"
  "server/api/v2/auth.js"
  "server/api/v2/session-routes.js"
  "server/api/v2/event-routes.js"
  "server/api/v2/authorize.js"
  "server/api/v2/cors-security.js"
  "server/api/v2/readiness.js"
  "server/api/v2/arduino-error-mapper.js"
  "server/api/v2/error-handler.js"
  "server/api/v2/routes.js"
  "server/api/v2/led-routes.js"
  "server/api/v2/schedule-routes.js"
  "server/api/v2/local-schedule-routes.js"
  "server/api/v2/firmware-routes.js"
  "server/api/v2/api-v2-bootstrap.js"
  "scripts/test-core-modules.js"
  "scripts/test-arduino-client.js"
  "scripts/test-server-platform-modules.js"
  "scripts/test-led-service.js"
  "scripts/test-api-v2-led.js"
  "scripts/test-schedule-service.js"
  "scripts/test-api-v2-schedule.js"
  "scripts/test-api-token-store.js"
  "scripts/test-session-service.js"
  "scripts/test-event-bus.js"
  "scripts/test-socket-gateway.js"
  "scripts/test-service-events.js"
  "scripts/test-api-v2-session-events.js"
  "scripts/test-update-rollback.sh"
  "scripts/test-local-schedule-repository.js"
  "scripts/test-local-schedule-runner.js"
  "scripts/test-firmware-service.js"
  "scripts/test-api-v2-extended.js"
  "scripts/test-health-endpoints.js"
  "scripts/test-api-v2.js"
  "docs/api/API_V2_CONTRACT.md"
  "docs/v5/SERVER_MODULE_MAP.md"
  "docs/v5/V5_REARCHITECTURE_CHECKLIST.md"
  "docs/v5/PACKAGE_MANIFEST_SESSION_EVENTS_ROLLBACK.json"
  "desktop-tauri/package.json"
  "desktop-tauri/package-lock.json"
  "desktop-tauri/src-tauri/Cargo.toml"
  "desktop-tauri/src-tauri/tauri.conf.json"
  "fejlesztes_readme.md"
  "deploy/ensure-node-dependencies.sh"
  "deploy/update-rollback-lib.sh"
  "deploy/update.sh"
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
  "scripts/test-lifecycle-manager.js"
  "scripts/test-metrics-registry.js"
  "scripts/test-event-store.js"
  "scripts/test-audit-log.js"
  "scripts/test-user-administration.js"
  "scripts/test-session-csrf.js"
  "scripts/test-local-schedule-update.js"
  "scripts/test-openapi-document.js"
  "scripts/test-alpha2-release-gate.js"
  "docs/api/openapi-v2.json"
  "docs/v5/ALPHA2_RELEASE_GATE.md"
  "deploy/test-alpha2-candidate.sh"
  "scripts/check-versions.py"
  "docs/v5/PACKAGE_MANIFEST_ADMIN_OPENAPI_OBSERVABILITY.json"
)
for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || {
    echo "HIBA: hiányzik: ${file}" >&2
    exit 1
  }
done

echo
echo "[5/6] Teljes modul- és endpointteszt"
npm test --silent

echo
echo "[6/6] Titkos fájlok ellenőrzése"
if git ls-files | grep -E '(^|/)(secrets\.h|\.env|connection\.json)$' >/dev/null; then
  echo "HIBA: titkos vagy helyi konfigurációs fájl van Git-követés alatt:" >&2
  git ls-files | grep -E '(^|/)(secrets\.h|\.env|connection\.json)$' >&2
  exit 1
fi

echo
echo "A repository alapellenőrzése sikeres."
