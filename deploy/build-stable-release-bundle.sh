#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${REF:-HEAD}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/dist/stable}"
VERSION="$(git -C "${ROOT_DIR}" show "${REF}:VERSION" | tr -d '[:space:]')"
COMMIT="$(git -C "${ROOT_DIR}" rev-parse "${REF}^{commit}")"
OUTPUT_BASENAME="${OUTPUT_BASENAME:-Arduino_LED_Controller_${VERSION}_LXC_Server}"
NAME="arduino-led-controller-${VERSION}-stable-${COMMIT:0:12}"
WORK_DIR="$(mktemp -d)"
ARCHIVE="${OUTPUT_DIR}/${OUTPUT_BASENAME}.tar.gz"
cleanup(){ rm -rf "${WORK_DIR}"; }
trap cleanup EXIT
[[ "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "HIBA: a Stable LXC csomaghoz prerelease suffix nélküli verzió szükséges: ${VERSION}" >&2
  exit 1
}
RELEASE_JSON="$(git -C "${ROOT_DIR}" show "${REF}:release-versions.json")"
printf '%s' "${RELEASE_JSON}" | node -e '
let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
 const r=JSON.parse(s);
 if(r.channel!=="stable"||r.applicationRelease?.channel!=="stable"||r.applicationRelease?.branch!=="main"||r.applicationRelease?.updaterAlias!=="updater-stable") process.exit(1);
});' || { echo "HIBA: Stable LXC release metadata nem Stable/main/updater-stable." >&2; exit 1; }
mkdir -p "${OUTPUT_DIR}"
git -C "${ROOT_DIR}" archive --format=tar --prefix="${NAME}/" "${COMMIT}" | tar -xf - -C "${WORK_DIR}"
node - "${WORK_DIR}/${NAME}/RELEASE-METADATA.json" "${VERSION}" "${COMMIT}" "${NAME}" <<'NODE'
const fs=require('fs'); const [file,version,commit,name]=process.argv.slice(2);
fs.writeFileSync(file, JSON.stringify({schemaVersion:2,name,version,commit,channel:'stable',phase:'production',candidate:'stable',createdAt:new Date().toISOString(),nodeMajorMinimum:20,installRoot:'/opt/arduino-led-controller',serviceName:'arduino-led-controller-rust.service',productionDeploymentIncluded:true},null,2)+'\n');
NODE
if find "${WORK_DIR}/${NAME}" -type f \( -name 'secrets.h' -o -name '.env' -o -name 'connection.json' \) -print -quit | grep -q .; then
  echo 'HIBA: titkos vagy helyi konfiguráció került a Stable LXC csomagba.' >&2; exit 1
fi
(cd "${WORK_DIR}" && tar -czf "${ARCHIVE}" "${NAME}")
if command -v sha256sum >/dev/null 2>&1; then sha256sum "${ARCHIVE}" > "${ARCHIVE}.sha256"; else shasum -a 256 "${ARCHIVE}" > "${ARCHIVE}.sha256"; fi
printf 'Stable LXC bundle: %s\n' "${ARCHIVE}"
printf 'Checksum: %s\n' "${ARCHIVE}.sha256"
