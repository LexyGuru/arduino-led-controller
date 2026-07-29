#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"

OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/dist/releases}"
GATE_REPORT="${GATE_REPORT:-}"
PROMOTION_APPROVAL="${PROMOTION_APPROVAL:-}"
PHASE="${PHASE:-staging}"
MAX_GATE_AGE_HOURS="${MAX_GATE_AGE_HOURS:-72}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

log() {
  printf '[alpha2-evidence-bundle] %s\n' "$*"
}

[[ -n "${GATE_REPORT}" ]] || {
  log 'HIBA: a GATE_REPORT kötelező.'
  exit 2
}

[[ -f "${GATE_REPORT}" ]] || {
  log "HIBA: hiányzó gate report: ${GATE_REPORT}"
  exit 1
}

if [[ "${PHASE}" == 'promotion' ]]; then
  [[ -n "${PROMOTION_APPROVAL}" ]] || {
    log 'HIBA: promotion fázisban PROMOTION_APPROVAL kötelező.'
    exit 2
  }

  [[ -f "${PROMOTION_APPROVAL}" ]] || {
    log "HIBA: hiányzó jóváhagyás: ${PROMOTION_APPROVAL}"
    exit 1
  }
elif [[ "${PHASE}" != 'staging' ]]; then
  log 'HIBA: PHASE csak staging vagy promotion lehet.'
  exit 2
fi

for command in git node tar sha256sum; do
  command -v "${command}" >/dev/null 2>&1 || {
    log "HIBA: hiányzó parancs: ${command}"
    exit 1
  }
done

if [[ "${ALLOW_DIRTY}" != '1' ]]; then
  git -C "${ROOT_DIR}" diff --quiet
  git -C "${ROOT_DIR}" diff --cached --quiet

  [[ -z "$(
    git -C "${ROOT_DIR}" \
      status \
      --porcelain \
      --untracked-files=normal
  )" ]] || {
    log 'HIBA: a release bundle csak tiszta working tree-ből készülhet.'
    exit 1
  }
fi

COMMIT="$(
  git -C "${ROOT_DIR}" \
    rev-parse \
    HEAD
)"

SHORT_COMMIT="$(
  printf '%s' "${COMMIT}" |
  cut -c1-12
)"

VERSION="$(
  node -p \
    "require('${ROOT_DIR}/package.json').version"
)"

NAME="arduino-led-controller-${VERSION}-${SHORT_COMMIT}"

TEMP_DIR="$(
  mktemp -d
)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

RELEASE_ROOT="${TEMP_DIR}/${NAME}"

mkdir -p \
  "${RELEASE_ROOT}"

git -C "${ROOT_DIR}" archive \
  --format=tar \
  "${COMMIT}" |
tar -xf - \
  -C "${RELEASE_ROOT}"

EVIDENCE_DIR="${RELEASE_ROOT}/release-evidence"

BUILD_ARGUMENTS=(
  --root "${RELEASE_ROOT}"
  --evidence-dir "${EVIDENCE_DIR}"
  --gate-report "${GATE_REPORT}"
  --phase "${PHASE}"
  --commit "${COMMIT}"
  --max-gate-age-hours "${MAX_GATE_AGE_HOURS}"
)

if [[ -n "${PROMOTION_APPROVAL}" ]]; then
  BUILD_ARGUMENTS+=(
    --approval "${PROMOTION_APPROVAL}"
  )
fi

node \
  "${RELEASE_ROOT}/scripts/build-alpha2-release-evidence.js" \
  "${BUILD_ARGUMENTS[@]}"

EVIDENCE_SHA="$(
  sha256sum \
    "${EVIDENCE_DIR}/RELEASE-EVIDENCE.json" |
  awk '{print $1}'
)"

node - \
  "${RELEASE_ROOT}/RELEASE-METADATA.json" \
  "${NAME}" \
  "${VERSION}" \
  "${COMMIT}" \
  "${PHASE}" \
  "${EVIDENCE_SHA}" \
  <<'NODE'
const fs = require('fs');

const [
  file,
  name,
  version,
  commit,
  phase,
  evidenceSha256
] = process.argv.slice(2);

fs.writeFileSync(
  file,
  `${JSON.stringify({
    schemaVersion: 2,
    name,
    version,
    targetVersion: '5.0.0-alpha.2',
    commit,
    phase,
    evidenceFile: 'release-evidence/RELEASE-EVIDENCE.json',
    evidenceSha256,
    builtAt:
      new Date()
        .toISOString()
  }, null, 2)}\n`,
  {
    mode: 0o644
  }
);
NODE

mkdir -p \
  "${OUTPUT_DIR}"

ARCHIVE="${OUTPUT_DIR}/${NAME}.tar.gz"

tar -czf \
  "${ARCHIVE}" \
  -C "${TEMP_DIR}" \
  "${NAME}"

sha256sum \
  "${ARCHIVE}" \
  > "${ARCHIVE}.sha256"

PHASE="${PHASE}" \
EXPECTED_COMMIT="${COMMIT}" \
  bash \
  "${ROOT_DIR}/deploy/verify-alpha2-release-bundle.sh" \
  "${ARCHIVE}"

log "Release bundle: ${ARCHIVE}"
log "Checksum: ${ARCHIVE}.sha256"
