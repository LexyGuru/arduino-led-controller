#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
CANDIDATE_REF="${CANDIDATE_REF:-origin/feature/v5-server-modularization}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health/ready}"
REPORT_DIR="${REPORT_DIR:-/var/lib/arduino-led-controller/release-gates}"
RECEIPT_DIR="${RECEIPT_DIR:-/var/lib/arduino-led-controller/release-execution}"
ARTIFACT_DIR="${ARTIFACT_DIR:-/var/lib/arduino-led-controller/release-execution/artifacts}"
STATE_FILE="${STATE_FILE:-${RECEIPT_DIR}/alpha2-orchestration-state.json}"
OUTPUT_FILE="${OUTPUT_FILE:-${RECEIPT_DIR}/alpha2-preflight.json}"
REQUIRED_BRANCH="${REQUIRED_BRANCH:-main}"
ALLOW_NON_MAIN="${ALLOW_NON_MAIN:-0}"
ALLOW_NON_ROOT="${ALLOW_NON_ROOT:-0}"
MIN_FREE_MB="${MIN_FREE_MB:-2048}"

GIT_COMMAND="${GIT_COMMAND:-git}"
NODE_COMMAND="${NODE_COMMAND:-node}"
NPM_COMMAND="${NPM_COMMAND:-npm}"
CURL_COMMAND="${CURL_COMMAND:-curl}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"
TAR_COMMAND="${TAR_COMMAND:-tar}"
SHA256_COMMAND="${SHA256_COMMAND:-sha256sum}"

if (
  [[ "${ALLOW_NON_ROOT}" != '1' ]] &&
  [[ "$(id -u)" -ne 0 ]]
); then
  echo 'HIBA: root jogosultság szükséges.' >&2
  exit 1
fi

for command in \
  "${GIT_COMMAND}" \
  "${NODE_COMMAND}" \
  "${NPM_COMMAND}" \
  "${CURL_COMMAND}" \
  "${SYSTEMCTL_COMMAND}" \
  "${TAR_COMMAND}" \
  "${SHA256_COMMAND}"; do
  command -v "${command}" \
    >/dev/null 2>&1 || {
      echo "HIBA: hiányzó parancs: ${command}" >&2
      exit 1
    }
done

[[ -e "${APP_DIR}/.git" ]] || {
  echo "HIBA: nem Git repository: ${APP_DIR}" >&2
  exit 1
}

BRANCH="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    branch \
    --show-current
)"

if (
  [[ "${ALLOW_NON_MAIN}" != '1' ]] &&
  [[ "${BRANCH}" != "${REQUIRED_BRANCH}" ]]
); then
  echo "HIBA: a produkciós repository ága ${BRANCH}, elvárt: ${REQUIRED_BRANCH}" >&2
  exit 1
fi

STATUS="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    status \
    --porcelain=v1 \
    --untracked-files=all
)"

[[ -z "${STATUS}" ]] || {
  echo 'HIBA: a produkciós working tree nem tiszta.' >&2
  exit 1
}

BASELINE_COMMIT="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    rev-parse \
    HEAD
)"

CANDIDATE_COMMIT="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    rev-parse \
    "${CANDIDATE_REF}^{commit}"
)"

CANDIDATE_VERSION="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    show \
    "${CANDIDATE_COMMIT}:package.json" |
  "${NODE_COMMAND}" -e '
    let input = "";
    process.stdin.on("data", chunk => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      process.stdout.write(
        String(
          JSON.parse(input).version || ""
        )
      );
    });
  '
)"

[[ "${CANDIDATE_VERSION}" == '5.0.0-alpha.1' ]] || {
  echo "HIBA: a candidate forrásverziója nem 5.0.0-alpha.1: ${CANDIDATE_VERSION}" >&2
  exit 1
}

"${SYSTEMCTL_COMMAND}" \
  is-active \
  --quiet \
  "${SERVICE_NAME}" || {
    echo "HIBA: a produkciós szolgáltatás nem aktív: ${SERVICE_NAME}" >&2
    exit 1
  }

"${CURL_COMMAND}" \
  -fsS \
  --max-time 5 \
  "${HEALTH_URL}" \
  >/dev/null || {
    echo "HIBA: a produkciós health endpoint nem ready: ${HEALTH_URL}" >&2
    exit 1
  }

FREE_MB="$(
  df -Pm "${APP_DIR}" |
  awk 'NR == 2 {print $4}'
)"

[[ "${FREE_MB}" -ge "${MIN_FREE_MB}" ]] || {
  echo "HIBA: kevés szabad lemezterület: ${FREE_MB} MiB, minimum ${MIN_FREE_MB} MiB." >&2
  exit 1
}

install -d \
  -m 0750 \
  "${REPORT_DIR}" \
  "${RECEIPT_DIR}" \
  "${ARTIFACT_DIR}"

install -d \
  -m 0750 \
  "$(
    dirname "${STATE_FILE}"
  )" \
  "$(
    dirname "${OUTPUT_FILE}"
  )"

"${NODE_COMMAND}" - \
  "${OUTPUT_FILE}" \
  "${APP_DIR}" \
  "${BRANCH}" \
  "${BASELINE_COMMIT}" \
  "${CANDIDATE_REF}" \
  "${CANDIDATE_COMMIT}" \
  "${CANDIDATE_VERSION}" \
  "${SERVICE_NAME}" \
  "${HEALTH_URL}" \
  "${FREE_MB}" \
  "${MIN_FREE_MB}" \
  <<'NODE'
const fs = require('fs');

const [
  file,
  appDir,
  branch,
  baselineCommit,
  candidateRef,
  candidateCommit,
  candidateVersion,
  serviceName,
  healthUrl,
  freeMb,
  minimumFreeMb
] = process.argv.slice(2);

fs.writeFileSync(
  file,
  `${JSON.stringify({
    schemaVersion: 1,
    passed: true,
    appDir,
    branch,
    baselineCommit,
    candidateRef,
    candidateCommit,
    candidateVersion,
    targetVersion:
      '5.0.0-alpha.2',
    serviceName,
    healthUrl,
    disk: {
      freeMb:
        Number(freeMb),
      minimumFreeMb:
        Number(minimumFreeMb)
    },
    checkedAt:
      new Date()
        .toISOString()
  }, null, 2)}\n`,
  {
    mode: 0o640
  }
);
NODE

echo "OK: alpha.2 LXC preflight"
echo "Baseline: ${BRANCH} ${BASELINE_COMMIT}"
echo "Candidate: ${CANDIDATE_REF} ${CANDIDATE_COMMIT}"
echo "Szabad hely: ${FREE_MB} MiB"
