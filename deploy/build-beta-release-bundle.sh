#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${REF:-HEAD}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/dist/beta}"
VERSION="$(git -C "${ROOT_DIR}" show "${REF}:VERSION" | tr -d '[:space:]')"
COMMIT="$(git -C "${ROOT_DIR}" rev-parse "${REF}^{commit}")"
OUTPUT_BASENAME="${OUTPUT_BASENAME:-Arduino_LED_Controller_${VERSION}_LXC_Server}"
NAME="arduino-led-controller-${VERSION}-staging-${COMMIT:0:12}"
WORK_DIR="$(mktemp -d)"
ARCHIVE="${OUTPUT_DIR}/${OUTPUT_BASENAME}.tar.gz"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

[[ "${VERSION}" =~ ^5\.0\.0-beta\.[0-9]+$ ]] || {
  echo "HIBA: a Beta LXC csomaghoz beta verzió szükséges: ${VERSION}" >&2
  exit 1
}

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
  "${NAME}" <<'NODE'
const fs = require('fs');
const [file, version, commit, name] = process.argv.slice(2);
fs.writeFileSync(file, `${JSON.stringify({
  schemaVersion: 2,
  name,
  version,
  commit,
  channel: 'beta',
  phase: 'staging',
  candidate: 'beta.8-gate',
  createdAt: new Date().toISOString(),
  nodeMajorMinimum: 20,
  installRoot: '/opt/arduino-led-controller-staging',
  serviceName: 'arduino-led-controller-staging',
  productionDeploymentIncluded: false
}, null, 2)}\n`);
NODE

if find "${WORK_DIR}/${NAME}" -type f \
  \( -name 'secrets.h' -o -name '.env' -o -name 'connection.json' \) \
  -print -quit | grep -q .; then
  echo 'HIBA: titkos vagy helyi konfiguráció került a Beta LXC csomagba.' >&2
  exit 1
fi

(
  cd "${WORK_DIR}"
  tar -czf "${ARCHIVE}" "${NAME}"
)

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${ARCHIVE}" > "${ARCHIVE}.sha256"
else
  shasum -a 256 "${ARCHIVE}" > "${ARCHIVE}.sha256"
fi

printf 'Beta LXC bundle: %s\n' "${ARCHIVE}"
printf 'Checksum: %s\n' "${ARCHIVE}.sha256"
