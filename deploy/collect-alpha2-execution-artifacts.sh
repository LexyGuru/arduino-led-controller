#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"

REPORT_DIR="${REPORT_DIR:-/var/lib/arduino-led-controller/release-gates}"
RECEIPT_DIR="${RECEIPT_DIR:-/var/lib/arduino-led-controller/release-execution}"
ARTIFACT_DIR="${ARTIFACT_DIR:-${RECEIPT_DIR}/artifacts}"
STATE_FILE="${STATE_FILE:-${RECEIPT_DIR}/alpha2-orchestration-state.json}"
GUARD_FILE="${GUARD_FILE:-${RECEIPT_DIR}/production-guard.json}"
GUARD_VERIFICATION_FILE="${GUARD_VERIFICATION_FILE:-${RECEIPT_DIR}/production-guard-verification.json}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
STAGING_SERVICE_NAME="${STAGING_SERVICE_NAME:-arduino-led-controller-staging}"
PRODUCTION_HEALTH_URL="${PRODUCTION_HEALTH_URL:-http://127.0.0.1:3000/health/ready}"
STAGING_HEALTH_URL="${STAGING_HEALTH_URL:-http://127.0.0.1:3100/health/ready}"
NODE_COMMAND="${NODE_COMMAND:-node}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"
CURL_COMMAND="${CURL_COMMAND:-curl}"

install -d \
  -m 0750 \
  "${ARTIFACT_DIR}"

COLLECTION_DIR="$(
  mktemp -d
)"

cleanup() {
  rm -rf "${COLLECTION_DIR}"
}

trap cleanup EXIT

mkdir -p \
  "${COLLECTION_DIR}/reports" \
  "${COLLECTION_DIR}/receipts" \
  "${COLLECTION_DIR}/state" \
  "${COLLECTION_DIR}/health"

copy_if_present() {
  local source="$1"
  local destination="$2"

  if [[ -f "${source}" ]]; then
    cp \
      "${source}" \
      "${destination}"
  fi
}

copy_if_present \
  "${STATE_FILE}" \
  "${COLLECTION_DIR}/state/alpha2-orchestration-state.json"

copy_if_present \
  "${GUARD_FILE}" \
  "${COLLECTION_DIR}/state/production-guard.json"

copy_if_present \
  "${GUARD_VERIFICATION_FILE}" \
  "${COLLECTION_DIR}/state/production-guard-verification.json"

for file in \
  staging-deployment.json \
  rollback-rehearsal.json \
  promotion-deployment.json \
  alpha2-finalization-approval.json; do
  copy_if_present \
    "${RECEIPT_DIR}/${file}" \
    "${COLLECTION_DIR}/receipts/${file}"
done

find "${REPORT_DIR}" \
  -maxdepth 1 \
  -type f \
  -name 'alpha2-*.json' \
  -exec cp {} \
    "${COLLECTION_DIR}/reports/" \;

service_json() {
  local service="$1"
  local output="$2"
  local active='false'
  local enabled='false'

  if "${SYSTEMCTL_COMMAND}" \
    is-active \
    --quiet \
    "${service}"; then
    active='true'
  fi

  if "${SYSTEMCTL_COMMAND}" \
    is-enabled \
    --quiet \
    "${service}" \
    >/dev/null 2>&1; then
    enabled='true'
  fi

  "${NODE_COMMAND}" - \
    "${output}" \
    "${service}" \
    "${active}" \
    "${enabled}" \
    <<'NODE'
const fs = require('fs');

const [
  file,
  service,
  active,
  enabled
] = process.argv.slice(2);

fs.writeFileSync(
  file,
  `${JSON.stringify({
    schemaVersion: 1,
    service,
    active:
      active === 'true',
    enabled:
      enabled === 'true',
    checkedAt:
      new Date()
        .toISOString()
  }, null, 2)}\n`
);
NODE
}

service_json \
  "${SERVICE_NAME}" \
  "${COLLECTION_DIR}/health/production-service.json"

service_json \
  "${STAGING_SERVICE_NAME}" \
  "${COLLECTION_DIR}/health/staging-service.json"

health_json() {
  local url="$1"
  local output="$2"
  local status='failed'

  if "${CURL_COMMAND}" \
    -fsS \
    --max-time 5 \
    "${url}" \
    > "${output}.body"; then
    status='passed'
  fi

  "${NODE_COMMAND}" - \
    "${output}" \
    "${url}" \
    "${status}" \
    "${output}.body" \
    <<'NODE'
const fs = require('fs');

const [
  file,
  url,
  status,
  bodyFile
] = process.argv.slice(2);

let body = '';

try {
  body = fs.readFileSync(
    bodyFile,
    'utf8'
  ).slice(0, 65536);
} catch {
  body = '';
}

fs.writeFileSync(
  file,
  `${JSON.stringify({
    schemaVersion: 1,
    url,
    passed:
      status === 'passed',
    body,
    checkedAt:
      new Date()
        .toISOString()
  }, null, 2)}\n`
);

fs.rmSync(
  bodyFile,
  {
    force: true
  }
);
NODE
}

health_json \
  "${PRODUCTION_HEALTH_URL}" \
  "${COLLECTION_DIR}/health/production-health.json"

health_json \
  "${STAGING_HEALTH_URL}" \
  "${COLLECTION_DIR}/health/staging-health.json"

"${NODE_COMMAND}" \
  "${ROOT_DIR}/scripts/build-alpha2-artifact-index.js" \
  --directory "${ARTIFACT_DIR}" \
  --output "${ARTIFACT_DIR}/index.json"

COMMIT="$(
  "${NODE_COMMAND}" - \
    "${STATE_FILE}" \
    <<'NODE'
const fs = require('fs');

try {
  const state = JSON.parse(
    fs.readFileSync(
      process.argv[2],
      'utf8'
    )
  );

  process.stdout.write(
    String(
      state.candidateCommit ||
      'unknown'
    ).slice(0, 12)
  );
} catch {
  process.stdout.write(
    'unknown'
  );
}
NODE
)"

STAMP="$(
  date -u \
    +%Y%m%dT%H%M%SZ
)"

ARCHIVE="${ARTIFACT_DIR}/alpha2-execution-${COMMIT}-${STAMP}.tar.gz"

tar -czf \
  "${ARCHIVE}" \
  -C "${COLLECTION_DIR}" \
  .

sha256sum \
  "${ARCHIVE}" \
  > "${ARCHIVE}.sha256"

"${NODE_COMMAND}" \
  "${ROOT_DIR}/scripts/build-alpha2-artifact-index.js" \
  --directory "${ARTIFACT_DIR}" \
  --output "${ARTIFACT_DIR}/index.json"

echo "Execution artifact archive: ${ARCHIVE}"
echo "Checksum: ${ARCHIVE}.sha256"
