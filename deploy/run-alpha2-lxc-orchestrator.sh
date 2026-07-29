#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
CANDIDATE_REF="${CANDIDATE_REF:-origin/feature/v5-server-modularization}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller}"
PRODUCTION_HEALTH_URL="${PRODUCTION_HEALTH_URL:-http://127.0.0.1:3000/health/ready}"
REPORT_DIR="${REPORT_DIR:-/var/lib/arduino-led-controller/release-gates}"
RECEIPT_DIR="${RECEIPT_DIR:-/var/lib/arduino-led-controller/release-execution}"
ARTIFACT_DIR="${ARTIFACT_DIR:-${RECEIPT_DIR}/artifacts}"
STATE_FILE="${STATE_FILE:-${RECEIPT_DIR}/alpha2-orchestration-state.json}"
GUARD_FILE="${GUARD_FILE:-${RECEIPT_DIR}/production-guard.json}"
GUARD_VERIFICATION_FILE="${GUARD_VERIFICATION_FILE:-${RECEIPT_DIR}/production-guard-verification.json}"

STAGING_INSTALL_ROOT="${STAGING_INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
STAGING_RELEASES_DIR="${STAGING_RELEASES_DIR:-${STAGING_INSTALL_ROOT}/releases}"
STAGING_CURRENT_LINK="${STAGING_CURRENT_LINK:-${STAGING_INSTALL_ROOT}/current}"
STAGING_SERVICE_NAME="${STAGING_SERVICE_NAME:-arduino-led-controller-staging}"
STAGING_HEALTH_URL="${STAGING_HEALTH_URL:-http://127.0.0.1:3100/health/ready}"
STAGING_ENV_FILE="${STAGING_ENV_FILE:-/etc/arduino-led-controller-staging.env}"

AUTO_INSTALL_STAGING_SERVICE="${AUTO_INSTALL_STAGING_SERVICE:-1}"
PROMOTION_APPROVAL="${PROMOTION_APPROVAL:-}"
PROMOTION_CONFIRM="${PROMOTION_CONFIRM:-}"

GIT_COMMAND="${GIT_COMMAND:-git}"
NODE_COMMAND="${NODE_COMMAND:-node}"

log() {
  printf '[alpha2-orchestrator] %s\n' "$*"
}

fail_phase() {
  local phase="$1"
  local code="$2"
  local message="$3"

  if [[ -f "${STATE_FILE}" ]]; then
    "${NODE_COMMAND}" \
      "${CANDIDATE_ROOT}/scripts/update-alpha2-orchestration-state.js" \
      --file "${STATE_FILE}" \
      --phase "${phase}" \
      --phase-status failed \
      --status failed \
      --error-code "${code}" \
      --error-message "${message}" \
      --message "${message}" \
      >/dev/null ||
      true
  fi

  log "HIBA [${code}]: ${message}"
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || {
  log 'HIBA: root jogosultság szükséges.'
  exit 1
}

[[ -e "${APP_DIR}/.git" ]] || {
  log "HIBA: nem Git repository: ${APP_DIR}"
  exit 1
}

for command in \
  "${GIT_COMMAND}" \
  "${NODE_COMMAND}" \
  npm \
  curl \
  systemctl \
  tar \
  sha256sum; do
  command -v "${command}" \
    >/dev/null 2>&1 || {
      log "HIBA: hiányzó parancs: ${command}"
      exit 1
    }
done

"${GIT_COMMAND}" \
  -C "${APP_DIR}" \
  fetch \
  --prune \
  origin

CANDIDATE_COMMIT="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    rev-parse \
    "${CANDIDATE_REF}^{commit}"
)"

BASELINE_BRANCH="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    branch \
    --show-current
)"

BASELINE_COMMIT="$(
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    rev-parse \
    HEAD
)"

WORKTREE="$(
  mktemp -d \
    /tmp/arduino-led-alpha2-orchestrator.XXXXXX
)"

cleanup() {
  "${GIT_COMMAND}" \
    -C "${APP_DIR}" \
    worktree remove \
    --force \
    "${WORKTREE}" \
    >/dev/null 2>&1 ||
    true

  rm -rf \
    "${WORKTREE}"
}

trap cleanup EXIT

"${GIT_COMMAND}" \
  -C "${APP_DIR}" \
  worktree add \
  --detach \
  "${WORKTREE}" \
  "${CANDIDATE_COMMIT}" \
  >/dev/null

CANDIDATE_ROOT="${WORKTREE}"

chmod +x \
  "${CANDIDATE_ROOT}/deploy/"*.sh \
  "${CANDIDATE_ROOT}/scripts/"*.js \
  >/dev/null 2>&1 ||
  true

install -d \
  -m 0750 \
  "${REPORT_DIR}" \
  "${RECEIPT_DIR}" \
  "${ARTIFACT_DIR}"

update_state() {
  "${NODE_COMMAND}" \
    "${CANDIDATE_ROOT}/scripts/update-alpha2-orchestration-state.js" \
    --file "${STATE_FILE}" \
    "$@" \
    >/dev/null
}

guard_verify() {
  CANDIDATE_COMMIT="${CANDIDATE_COMMIT}" \
  APP_DIR="${APP_DIR}" \
  SERVICE_NAME="${SERVICE_NAME}" \
  HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
  VERIFICATION_FILE="${GUARD_VERIFICATION_FILE}" \
    bash \
    "${CANDIDATE_ROOT}/deploy/alpha2-production-guard.sh" \
    verify \
    "${GUARD_FILE}"
}

latest_gate_report() {
  "${NODE_COMMAND}" - \
    "${REPORT_DIR}" \
    "${CANDIDATE_COMMIT}" \
    <<'NODE'
const fs = require('fs');
const path = require('path');

const [
  directory,
  commit
] = process.argv.slice(2);

const matches =
  fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  )
  .filter(
    entry =>
      entry.isFile() &&
      /^alpha2-.*\.json$/.test(
        entry.name
      )
  )
  .map(
    entry => {
      const file =
        path.join(
          directory,
          entry.name
        );

      try {
        const data =
          JSON.parse(
            fs.readFileSync(
              file,
              'utf8'
            )
          );

        return {
          file,
          data,
          mtime:
            fs.statSync(file)
              .mtimeMs
        };
      } catch {
        return null;
      }
    }
  )
  .filter(Boolean)
  .filter(
    entry => {
      const candidate =
        String(
          entry.data
            .candidateCommit ||
          ''
        );

      return (
        entry.data.status ===
          'passed' &&
        (
          candidate === commit ||
          candidate.startsWith(
            commit
          ) ||
          commit.startsWith(
            candidate
          )
        )
      );
    }
  )
  .sort(
    (a, b) =>
      b.mtime -
      a.mtime
  );

if (!matches.length) {
  process.exit(1);
}

process.stdout.write(
  matches[0].file
);
NODE
}

bundle_for_phase() {
  local phase="$1"
  local directory="${ARTIFACT_DIR}/bundles/${phase}"

  find "${directory}" \
    -maxdepth 1 \
    -type f \
    -name '*.tar.gz' \
    -print0 |
  xargs -0 ls -1t |
  head -n 1
}

preflight() {
  APP_DIR="${APP_DIR}" \
  CANDIDATE_REF="${CANDIDATE_COMMIT}" \
  SERVICE_NAME="${SERVICE_NAME}" \
  HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
  REPORT_DIR="${REPORT_DIR}" \
  RECEIPT_DIR="${RECEIPT_DIR}" \
  ARTIFACT_DIR="${ARTIFACT_DIR}" \
  STATE_FILE="${STATE_FILE}" \
    bash \
    "${CANDIDATE_ROOT}/deploy/verify-alpha2-lxc-preflight.sh"
}

initialize_state() {
  "${NODE_COMMAND}" \
    "${CANDIDATE_ROOT}/scripts/update-alpha2-orchestration-state.js" \
    --file "${STATE_FILE}" \
    --initialize \
    --candidate-ref "${CANDIDATE_REF}" \
    --candidate-commit "${CANDIDATE_COMMIT}" \
    --baseline-branch "${BASELINE_BRANCH}" \
    --baseline-commit "${BASELINE_COMMIT}" \
    >/dev/null
}

case "${ACTION}" in
  status)
    if [[ -f "${STATE_FILE}" ]]; then
      cat "${STATE_FILE}"
    else
      printf '%s\n' \
        '{"present":false,"message":"Nincs alpha.2 orchestration state."}'
    fi
    ;;

  preflight)
    preflight
    ;;

  gate-stage)
    preflight
    initialize_state

    CANDIDATE_COMMIT="${CANDIDATE_COMMIT}" \
    APP_DIR="${APP_DIR}" \
    SERVICE_NAME="${SERVICE_NAME}" \
    HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/alpha2-production-guard.sh" \
      snapshot \
      "${GUARD_FILE}"

    update_state \
      --phase preflight \
      --phase-status passed \
      --message 'Az LXC preflight és produkciós őr snapshot sikeres.'

    update_state \
      --phase gate \
      --phase-status running \
      --message 'Izolált candidate release-gate fut.'

    APP_DIR="${APP_DIR}" \
    CANDIDATE_REF="${CANDIDATE_COMMIT}" \
    ENV_FILE="${ENV_FILE}" \
    SERVICE_NAME="${SERVICE_NAME}" \
    REPORT_DIR="${REPORT_DIR}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/run-alpha2-release-gate.sh" ||
      fail_phase \
        gate \
        ALPHA2_GATE_FAILED \
        'Az izolált alpha.2 release-gate sikertelen.'

    GATE_REPORT="$(
      latest_gate_report
    )" || fail_phase \
      gate \
      ALPHA2_GATE_REPORT_MISSING \
      'Nem található a candidate commitra érvényes sikeres gate report.'

    cp \
      "${GATE_REPORT}" \
      "${ARTIFACT_DIR}/$(
        basename "${GATE_REPORT}"
      )"

    update_state \
      --phase gate \
      --phase-status passed \
      --message 'Az izolált alpha.2 release-gate sikeres.' \
      --artifact-name gateReport \
      --artifact-value "${GATE_REPORT}"

    guard_verify ||
      fail_phase \
        gate \
        PRODUCTION_GUARD_FAILED \
        'A produkciós repository vagy szolgáltatás megváltozott a gate alatt.'

    update_state \
      --phase staging-bundle \
      --phase-status running \
      --message 'Staging evidence bundle készül.'

    STAGING_BUNDLE_DIR="${ARTIFACT_DIR}/bundles/staging"

    mkdir -p \
      "${STAGING_BUNDLE_DIR}"

    (
      cd "${CANDIDATE_ROOT}"

      OUTPUT_DIR="${STAGING_BUNDLE_DIR}" \
      GATE_REPORT="${GATE_REPORT}" \
      PHASE=staging \
        bash \
        deploy/build-alpha2-release-bundle.sh
    ) || fail_phase \
      staging-bundle \
      STAGING_BUNDLE_FAILED \
      'A staging evidence bundle készítése sikertelen.'

    STAGING_BUNDLE="$(
      bundle_for_phase \
        staging
    )" || fail_phase \
      staging-bundle \
      STAGING_BUNDLE_MISSING \
      'Nem található az elkészült staging bundle.'

    update_state \
      --phase staging-bundle \
      --phase-status passed \
      --message 'A staging evidence bundle elkészült.' \
      --artifact-name stagingBundle \
      --artifact-value "${STAGING_BUNDLE}"

    if (
      ! systemctl list-unit-files \
        "${STAGING_SERVICE_NAME}.service" \
        --no-legend |
      grep -q \
        "^${STAGING_SERVICE_NAME}.service"
    ); then
      if [[ "${AUTO_INSTALL_STAGING_SERVICE}" != '1' ]]; then
        fail_phase \
          staging-deployment \
          STAGING_SERVICE_NOT_INSTALLED \
          'A staging systemd szolgáltatás nincs telepítve.'
      fi

      ENV_TARGET="${STAGING_ENV_FILE}" \
        bash \
        "${CANDIDATE_ROOT}/deploy/install-staging-service.sh"
    fi

    update_state \
      --phase staging-deployment \
      --phase-status running \
      --message 'A staging bundle telepítése fut.'

    RECEIPT_DIR="${RECEIPT_DIR}" \
    INSTALL_ROOT="${STAGING_INSTALL_ROOT}" \
    RELEASES_DIR="${STAGING_RELEASES_DIR}" \
    CURRENT_LINK="${STAGING_CURRENT_LINK}" \
    SERVICE_NAME="${STAGING_SERVICE_NAME}" \
    HEALTH_URL="${STAGING_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/stage-alpha2-bundle.sh" \
      "${STAGING_BUNDLE}" ||
      fail_phase \
        staging-deployment \
        STAGING_DEPLOYMENT_FAILED \
        'A staging telepítés vagy health check sikertelen.'

    update_state \
      --phase staging-deployment \
      --phase-status passed \
      --message 'A staging release ready állapotú.' \
      --artifact-name stagingReceipt \
      --artifact-value "${RECEIPT_DIR}/staging-deployment.json"

    guard_verify ||
      fail_phase \
        staging-deployment \
        PRODUCTION_GUARD_FAILED \
        'A produkciós repository vagy szolgáltatás megváltozott a staging telepítés alatt.'

    update_state \
      --phase rollback-rehearsal \
      --phase-status running \
      --message 'Szándékos health-hibás rollback-próba fut.'

    RECEIPT_DIR="${RECEIPT_DIR}" \
    INSTALL_ROOT="${STAGING_INSTALL_ROOT}" \
    RELEASES_DIR="${STAGING_RELEASES_DIR}" \
    CURRENT_LINK="${STAGING_CURRENT_LINK}" \
    SERVICE_NAME="${STAGING_SERVICE_NAME}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/rehearse-alpha2-rollback.sh" \
      "${STAGING_BUNDLE}" ||
      fail_phase \
        rollback-rehearsal \
        ROLLBACK_REHEARSAL_FAILED \
        'A staging rollback-próba sikertelen.'

    update_state \
      --phase rollback-rehearsal \
      --phase-status passed \
      --message 'A rollback-próba sikeres, a staging current symlink visszaállt.' \
      --artifact-name rollbackReceipt \
      --artifact-value "${RECEIPT_DIR}/rollback-rehearsal.json"

    guard_verify ||
      fail_phase \
        rollback-rehearsal \
        PRODUCTION_GUARD_FAILED \
        'A produkciós repository vagy szolgáltatás megváltozott a rollback-próba alatt.'

    update_state \
      --phase receipt-verification \
      --phase-status passed \
      --status awaiting-promotion \
      --message 'A staging és rollback receipt elkészült. A folyamat promóciós jóváhagyásra vár.'

    REPORT_DIR="${REPORT_DIR}" \
    RECEIPT_DIR="${RECEIPT_DIR}" \
    ARTIFACT_DIR="${ARTIFACT_DIR}" \
    STATE_FILE="${STATE_FILE}" \
    GUARD_FILE="${GUARD_FILE}" \
    GUARD_VERIFICATION_FILE="${GUARD_VERIFICATION_FILE}" \
    SERVICE_NAME="${SERVICE_NAME}" \
    STAGING_SERVICE_NAME="${STAGING_SERVICE_NAME}" \
    PRODUCTION_HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
    STAGING_HEALTH_URL="${STAGING_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/collect-alpha2-execution-artifacts.sh"

    update_state \
      --phase artifact-collection \
      --phase-status passed \
      --status awaiting-promotion \
      --message 'A gate-stage artifactcsomag elkészült.'

    log 'A gate–staging–rollback szakasz sikeres.'
    log 'Következő lépés: promóciós jóváhagyás, majd promote.'
    ;;

  promote)
    preflight

    [[ -f "${STATE_FILE}" ]] || {
      log "HIBA: hiányzó orchestration state: ${STATE_FILE}"
      exit 1
    }

    "${NODE_COMMAND}" \
      "${CANDIDATE_ROOT}/scripts/update-alpha2-orchestration-state.js" \
      --file "${STATE_FILE}" \
      --verify \
      --expected-commit "${CANDIDATE_COMMIT}" \
      >/dev/null

    CURRENT_STATUS="$(
      "${NODE_COMMAND}" - \
        "${STATE_FILE}" \
        <<'NODE'
const fs = require('fs');
const state = JSON.parse(
  fs.readFileSync(
    process.argv[2],
    'utf8'
  )
);
process.stdout.write(
  String(state.status || '')
);
NODE
    )"

    [[ "${CURRENT_STATUS}" == 'awaiting-promotion' ]] || {
      log "HIBA: az orchestration nem vár promócióra: ${CURRENT_STATUS}"
      exit 1
    }

    [[ -f "${PROMOTION_APPROVAL}" ]] || {
      log "HIBA: hiányzó PROMOTION_APPROVAL: ${PROMOTION_APPROVAL}"
      exit 1
    }

    [[ "${PROMOTION_CONFIRM}" == 'EXECUTE_ALPHA2_PROMOTION' ]] || {
      log 'HIBA: a PROMOTION_CONFIRM pontos értéke EXECUTE_ALPHA2_PROMOTION legyen.'
      exit 1
    }

    guard_verify ||
      fail_phase \
        promotion-bundle \
        PRODUCTION_GUARD_FAILED \
        'A produkciós őrellenőrzés promóció előtt sikertelen.'

    GATE_REPORT="$(
      latest_gate_report
    )" || fail_phase \
      promotion-bundle \
      ALPHA2_GATE_REPORT_MISSING \
      'Nem található érvényes gate report.'

    update_state \
      --phase promotion-bundle \
      --phase-status running \
      --message 'Promotion evidence bundle készül.'

    PROMOTION_BUNDLE_DIR="${ARTIFACT_DIR}/bundles/promotion"

    mkdir -p \
      "${PROMOTION_BUNDLE_DIR}"

    (
      cd "${CANDIDATE_ROOT}"

      OUTPUT_DIR="${PROMOTION_BUNDLE_DIR}" \
      GATE_REPORT="${GATE_REPORT}" \
      PROMOTION_APPROVAL="${PROMOTION_APPROVAL}" \
      PHASE=promotion \
        bash \
        deploy/build-alpha2-release-bundle.sh
    ) || fail_phase \
      promotion-bundle \
      PROMOTION_BUNDLE_FAILED \
      'A promotion evidence bundle készítése sikertelen.'

    PROMOTION_BUNDLE="$(
      bundle_for_phase \
        promotion
    )" || fail_phase \
      promotion-bundle \
      PROMOTION_BUNDLE_MISSING \
      'Nem található az elkészült promotion bundle.'

    update_state \
      --phase promotion-bundle \
      --phase-status passed \
      --message 'A promotion evidence bundle elkészült.' \
      --artifact-name promotionBundle \
      --artifact-value "${PROMOTION_BUNDLE}"

    update_state \
      --phase promotion-deployment \
      --phase-status running \
      --message 'A promotion bundle staging telepítése fut.'

    RECEIPT_DIR="${RECEIPT_DIR}" \
    INSTALL_ROOT="${STAGING_INSTALL_ROOT}" \
    RELEASES_DIR="${STAGING_RELEASES_DIR}" \
    CURRENT_LINK="${STAGING_CURRENT_LINK}" \
    SERVICE_NAME="${STAGING_SERVICE_NAME}" \
    HEALTH_URL="${STAGING_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/promote-alpha2-staging.sh" \
      "${PROMOTION_BUNDLE}" ||
      fail_phase \
        promotion-deployment \
        PROMOTION_DEPLOYMENT_FAILED \
        'A promotion bundle staging telepítése sikertelen.'

    update_state \
      --phase promotion-deployment \
      --phase-status passed \
      --message 'A promotion bundle ready állapotú.' \
      --artifact-name promotionReceipt \
      --artifact-value "${RECEIPT_DIR}/promotion-deployment.json"

    guard_verify ||
      fail_phase \
        promotion-deployment \
        PRODUCTION_GUARD_FAILED \
        'A produkciós repository vagy szolgáltatás megváltozott a promotion alatt.'

    update_state \
      --phase receipt-verification \
      --phase-status running \
      --message 'A teljes receipt-lánc ellenőrzése fut.'

    "${NODE_COMMAND}" \
      "${CANDIDATE_ROOT}/scripts/verify-alpha2-execution-receipts.js" \
      --receipt-dir "${RECEIPT_DIR}" \
      --commit "${CANDIDATE_COMMIT}" \
      >/dev/null ||
      fail_phase \
        receipt-verification \
        RECEIPT_CHAIN_INVALID \
        'A staging–rollback–promotion receipt-lánc érvénytelen.'

    update_state \
      --phase receipt-verification \
      --phase-status passed \
      --status ready-for-finalization \
      --message 'A teljes receipt-lánc érvényes; a rendszer véglegesítési jóváhagyásra kész.'

    REPORT_DIR="${REPORT_DIR}" \
    RECEIPT_DIR="${RECEIPT_DIR}" \
    ARTIFACT_DIR="${ARTIFACT_DIR}" \
    STATE_FILE="${STATE_FILE}" \
    GUARD_FILE="${GUARD_FILE}" \
    GUARD_VERIFICATION_FILE="${GUARD_VERIFICATION_FILE}" \
    SERVICE_NAME="${SERVICE_NAME}" \
    STAGING_SERVICE_NAME="${STAGING_SERVICE_NAME}" \
    PRODUCTION_HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
    STAGING_HEALTH_URL="${STAGING_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/collect-alpha2-execution-artifacts.sh"

    update_state \
      --phase artifact-collection \
      --phase-status passed \
      --status ready-for-finalization \
      --message 'A teljes alpha.2 execution artifactcsomag elkészült.'

    log 'A promotion és teljes receipt-lánc sikeres.'
    log 'A rendszer FINALIZE_ALPHA2_VERSION_SYNC jóváhagyásra kész.'
    ;;

  verify)
    preflight

    guard_verify

    "${NODE_COMMAND}" \
      "${CANDIDATE_ROOT}/scripts/update-alpha2-orchestration-state.js" \
      --file "${STATE_FILE}" \
      --verify \
      --expected-commit "${CANDIDATE_COMMIT}" \
      >/dev/null

    STATE_STATUS="$(
      "${NODE_COMMAND}" - \
        "${STATE_FILE}" \
        <<'NODE'
const fs = require('fs');
const state = JSON.parse(
  fs.readFileSync(
    process.argv[2],
    'utf8'
  )
);
process.stdout.write(
  String(state.status || '')
);
NODE
    )"

    if [[ "${STATE_STATUS}" == 'ready-for-finalization' ]]; then
      "${NODE_COMMAND}" \
        "${CANDIDATE_ROOT}/scripts/verify-alpha2-execution-receipts.js" \
        --receipt-dir "${RECEIPT_DIR}" \
        --commit "${CANDIDATE_COMMIT}" \
        >/dev/null
    elif [[ "${STATE_STATUS}" != 'awaiting-promotion' ]]; then
      log "HIBA: nem ellenőrizhető orchestration status: ${STATE_STATUS}"
      exit 1
    fi

    log "OK: alpha.2 orchestration: ${STATE_STATUS}"
    ;;

  collect)
    REPORT_DIR="${REPORT_DIR}" \
    RECEIPT_DIR="${RECEIPT_DIR}" \
    ARTIFACT_DIR="${ARTIFACT_DIR}" \
    STATE_FILE="${STATE_FILE}" \
    GUARD_FILE="${GUARD_FILE}" \
    GUARD_VERIFICATION_FILE="${GUARD_VERIFICATION_FILE}" \
    SERVICE_NAME="${SERVICE_NAME}" \
    STAGING_SERVICE_NAME="${STAGING_SERVICE_NAME}" \
    PRODUCTION_HEALTH_URL="${PRODUCTION_HEALTH_URL}" \
    STAGING_HEALTH_URL="${STAGING_HEALTH_URL}" \
      bash \
      "${CANDIDATE_ROOT}/deploy/collect-alpha2-execution-artifacts.sh"
    ;;

  *)
    log 'Használat: run-alpha2-lxc-orchestrator.sh status|preflight|gate-stage|promote|verify|collect'
    exit 2
    ;;
esac
