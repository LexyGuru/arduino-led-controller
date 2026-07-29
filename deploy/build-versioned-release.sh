#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${REF:-HEAD}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/dist/releases}"
VERSION="$(git -C "${ROOT_DIR}" show "${REF}:VERSION" | tr -d '[:space:]')"
COMMIT="$(git -C "${ROOT_DIR}" rev-parse "${REF}^{commit}")"
NAME="arduino-led-controller-${VERSION}-${COMMIT:0:12}"
WORK_DIR="$(mktemp -d)"
ARCHIVE="${OUTPUT_DIR}/${NAME}.tar.gz"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

mkdir -p "${OUTPUT_DIR}"

git -C "${ROOT_DIR}" archive \
  --format=tar \
  --prefix="${NAME}/" \
  "${COMMIT}" \
  | tar -xf - -C "${WORK_DIR}"

node - \
  "${WORK_DIR}/${NAME}/RELEASE-METADATA.json" \
  "${VERSION}" \
  "${COMMIT}" \
  "${NAME}" \
  <<'NODE'
const fs = require('fs');
const [file, version, commit, name] = process.argv.slice(2);
fs.writeFileSync(file, `${JSON.stringify({
  schemaVersion: 1,
  name,
  version,
  commit,
  createdAt: new Date().toISOString(),
  nodeMajorMinimum: 20
}, null, 2)}\n`);
NODE

(
  cd "${WORK_DIR}"
  tar -czf "${ARCHIVE}" "${NAME}"
)

shasum -a 256 "${ARCHIVE}" > "${ARCHIVE}.sha256"

printf 'Release bundle: %s\n' "${ARCHIVE}"
printf 'Checksum: %s\n' "${ARCHIVE}.sha256"
