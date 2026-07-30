#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"
FILE="${2:-}"

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health/ready}"
CURRENT_LINK="${CURRENT_LINK:-}"
CANDIDATE_COMMIT="${CANDIDATE_COMMIT:-}"
GIT_COMMAND="${GIT_COMMAND:-git}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"
CURL_COMMAND="${CURL_COMMAND:-curl}"
NODE_COMMAND="${NODE_COMMAND:-node}"
SHA256_COMMAND="${SHA256_COMMAND:-sha256sum}"
VERIFICATION_FILE="${VERIFICATION_FILE:-}"

usage() {
  echo 'Használat: deploy/alpha2-production-guard.sh snapshot|verify <fájl>' >&2
}

[[ -n "${COMMAND}" && -n "${FILE}" ]] || {
  usage
  exit 2
}

[[ -e "${APP_DIR}/.git" ]] || {
  echo "HIBA: nem Git repository: ${APP_DIR}" >&2
  exit 1
}

status_hash() {
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    status \
    --porcelain=v1 \
    --untracked-files=all |
  "${SHA256_COMMAND}" |
  awk '{print $1}'
}

collect() {
  local branch
  local commit
  local clean_hash
  local service_active='false'
  local health_passed='false'
  local current_target=''

  branch="$(
    "${GIT_COMMAND}" \
      -C "${APP_DIR}" \
      branch \
      --show-current
  )"

  commit="$(
    "${GIT_COMMAND}" \
      -C "${APP_DIR}" \
      rev-parse \
      HEAD
  )"

  clean_hash="$(
    status_hash
  )"

  if "${SYSTEMCTL_COMMAND}" \
    is-active \
    --quiet \
    "${SERVICE_NAME}"; then
    service_active='true'
  fi

  if "${CURL_COMMAND}" \
    -fsS \
    --max-time 5 \
    "${HEALTH_URL}" \
    >/dev/null; then
    health_passed='true'
  fi

  if (
    [[ -n "${CURRENT_LINK}" ]] &&
    [[ -L "${CURRENT_LINK}" ]]
  ); then
    current_target="$(
      readlink "${CURRENT_LINK}"
    )"
  fi

  "${NODE_COMMAND}" - \
    "${branch}" \
    "${commit}" \
    "${clean_hash}" \
    "${service_active}" \
    "${health_passed}" \
    "${current_target}" \
    "${SERVICE_NAME}" \
    "${HEALTH_URL}" \
    "${CANDIDATE_COMMIT}" \
    <<'NODE'
const [
  branch,
  commit,
  statusSha256,
  serviceActive,
  healthPassed,
  currentTarget,
  serviceName,
  healthUrl,
  candidateCommit
] = process.argv.slice(2);

process.stdout.write(
  `${JSON.stringify({
    schemaVersion: 1,
    branch,
    commit,
    statusSha256,
    serviceActive:
      serviceActive === 'true',
    healthPassed:
      healthPassed === 'true',
    currentTarget:
      currentTarget || null,
    serviceName,
    healthUrl,
    candidateCommit:
      candidateCommit || null,
    checkedAt:
      new Date()
        .toISOString()
  }, null, 2)}\n`
);
NODE
}

case "${COMMAND}" in
  snapshot)
    install -d \
      -m 0750 \
      "$(
        dirname "${FILE}"
      )"

    collect > "${FILE}"

    chmod 0640 \
      "${FILE}"

    echo "Produkciós őr snapshot: ${FILE}"
    ;;

  verify)
    [[ -f "${FILE}" ]] || {
      echo "HIBA: hiányzó produkciós őr snapshot: ${FILE}" >&2
      exit 1
    }

    CURRENT="$(
      mktemp
    )"

    cleanup() {
      rm -f "${CURRENT}"
    }

    trap cleanup EXIT

    collect > "${CURRENT}"

    OUTPUT="$(
      "${NODE_COMMAND}" - \
        "${FILE}" \
        "${CURRENT}" \
        <<'NODE'
const fs = require('fs');

const expected =
  JSON.parse(
    fs.readFileSync(
      process.argv[2],
      'utf8'
    )
  );

const actual =
  JSON.parse(
    fs.readFileSync(
      process.argv[3],
      'utf8'
    )
  );

const checks = {
  branch:
    expected.branch ===
    actual.branch,
  commit:
    expected.commit ===
    actual.commit,
  statusSha256:
    expected.statusSha256 ===
    actual.statusSha256,
  serviceActive:
    actual.serviceActive ===
    true,
  healthPassed:
    actual.healthPassed ===
    true,
  currentTarget:
    expected.currentTarget ===
    actual.currentTarget
};

const failed =
  Object.entries(checks)
    .filter(
      ([, passed]) =>
        !passed
    )
    .map(
      ([name]) =>
        name
    );

const output = {
  schemaVersion: 1,
  passed:
    failed.length === 0,
  candidateCommit:
    actual.candidateCommit ||
    expected.candidateCommit ||
    null,
  expected,
  actual,
  checks,
  failed,
  verifiedAt:
    new Date()
      .toISOString()
};

process.stdout.write(
  `${JSON.stringify(
    output,
    null,
    2
  )}\n`
);

if (!output.passed) {
  process.exitCode = 1;
}
NODE
    )" || {
      STATUS="$?"

      if [[ -n "${VERIFICATION_FILE}" ]]; then
        install -d \
          -m 0750 \
          "$(
            dirname "${VERIFICATION_FILE}"
          )"

        printf '%s\n' "${OUTPUT}" \
          > "${VERIFICATION_FILE}"

        chmod 0640 \
          "${VERIFICATION_FILE}"
      fi

      printf '%s\n' "${OUTPUT}"
      exit "${STATUS}"
    }

    if [[ -n "${VERIFICATION_FILE}" ]]; then
      install -d \
        -m 0750 \
        "$(
          dirname "${VERIFICATION_FILE}"
        )"

      printf '%s\n' "${OUTPUT}" \
        > "${VERIFICATION_FILE}"

      chmod 0640 \
        "${VERIFICATION_FILE}"
    fi

    printf '%s\n' "${OUTPUT}"
    ;;

  *)
    usage
    exit 2
    ;;
esac
