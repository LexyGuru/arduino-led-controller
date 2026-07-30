#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:-}"

[[ -n "${ARCHIVE}" ]] || {
  echo 'Használat: deploy/verify-alpha2-release-bundle.sh <release.tar.gz>' >&2
  exit 2
}

ARCHIVE="$(
  cd "$(
    dirname "${ARCHIVE}"
  )" &&
  pwd
)/$(
  basename "${ARCHIVE}"
)"

CHECKSUM_FILE="${CHECKSUM_FILE:-${ARCHIVE}.sha256}"
PHASE="${PHASE:-}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
MAX_EVIDENCE_AGE_HOURS="${MAX_EVIDENCE_AGE_HOURS:-168}"

for command in tar node sha256sum; do
  command -v "${command}" >/dev/null 2>&1 || {
    echo "HIBA: hiányzó parancs: ${command}" >&2
    exit 1
  }
done

[[ -f "${ARCHIVE}" ]] || {
  echo "HIBA: hiányzó archive: ${ARCHIVE}" >&2
  exit 1
}

[[ -f "${CHECKSUM_FILE}" ]] || {
  echo "HIBA: hiányzó checksum: ${CHECKSUM_FILE}" >&2
  exit 1
}

(
  cd "$(
    dirname "${ARCHIVE}"
  )"

  sha256sum \
    --check \
    "$(
      basename "${CHECKSUM_FILE}"
    )"
)

TEMP_DIR="$(
  mktemp -d
)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

tar -xzf \
  "${ARCHIVE}" \
  -C "${TEMP_DIR}"

readarray -t ROOTS < <(
  find "${TEMP_DIR}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -print
)

[[ "${#ROOTS[@]}" -eq 1 ]] || {
  echo 'HIBA: az archive pontosan egy gyökérkönyvtárat tartalmazzon.' >&2
  exit 1
}

RELEASE_ROOT="${ROOTS[0]}"
METADATA="${RELEASE_ROOT}/RELEASE-METADATA.json"

[[ -f "${METADATA}" ]] || {
  echo 'HIBA: hiányzik a RELEASE-METADATA.json.' >&2
  exit 1
}

readarray -t META < <(
  node - \
    "${METADATA}" \
    <<'NODE'
const fs = require('fs');
const data = JSON.parse(
  fs.readFileSync(
    process.argv[2],
    'utf8'
  )
);

for (
  const key
  of [
    'schemaVersion',
    'version',
    'commit',
    'phase',
    'evidenceFile',
    'evidenceSha256'
  ]
) {
  const value =
    data[key];

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    throw new Error(
      `Hiányzó metadata mező: ${key}`
    );
  }

  console.log(
    String(value)
  );
}
NODE
)

[[ "${META[0]}" == '2' ]] || {
  echo 'HIBA: a release metadata schemaVersion nem 2.' >&2
  exit 1
}

VERSION="${META[1]}"
COMMIT="${META[2]}"
METADATA_PHASE="${META[3]}"
EVIDENCE_RELATIVE="${META[4]}"
EXPECTED_EVIDENCE_SHA="${META[5]}"
EVIDENCE_FILE="${RELEASE_ROOT}/${EVIDENCE_RELATIVE}"

[[ -f "${EVIDENCE_FILE}" ]] || {
  echo "HIBA: hiányzó release evidence: ${EVIDENCE_RELATIVE}" >&2
  exit 1
}

ACTUAL_EVIDENCE_SHA="$(
  sha256sum \
    "${EVIDENCE_FILE}" |
  awk '{print $1}'
)"

[[ "${ACTUAL_EVIDENCE_SHA}" == "${EXPECTED_EVIDENCE_SHA}" ]] || {
  echo 'HIBA: eltérő RELEASE-EVIDENCE.json SHA-256.' >&2
  exit 1
}

if [[ -n "${EXPECTED_COMMIT}" ]]; then
  node - \
    "${COMMIT}" \
    "${EXPECTED_COMMIT}" \
    <<'NODE'
const [actual, expected] =
  process.argv.slice(2);

const matches =
  actual === expected ||
  actual.startsWith(expected) ||
  expected.startsWith(actual);

if (!matches) {
  process.exit(1);
}
NODE
fi

if [[ -n "${PHASE}" && "${METADATA_PHASE}" != "${PHASE}" ]]; then
  echo "HIBA: eltérő bundle phase: ${METADATA_PHASE}" >&2
  exit 1
fi

node \
  "${RELEASE_ROOT}/scripts/verify-alpha2-release-evidence.js" \
  --root "${RELEASE_ROOT}" \
  --evidence "${EVIDENCE_FILE}" \
  --expected-commit "${COMMIT}" \
  --phase "${METADATA_PHASE}" \
  --version "${VERSION}" \
  --max-age-hours "${MAX_EVIDENCE_AGE_HOURS}" \
  >/dev/null

echo "OK: alpha.2 release bundle és evidence: ${VERSION} (${COMMIT:0:12})"
