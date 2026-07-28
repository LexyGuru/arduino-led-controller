#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

cd "${ROOT_DIR}"

echo "[1/7] Verziók ellenőrzése"
python3 scripts/check-versions.py

echo
echo "[2/7] Node.js fájlok szintaktikai ellenőrzése"
node --check server2_final.js
node --check server2_legacy.js
node --check server/health-bootstrap.js
node --check server/api/v2/http-error.js
node --check server/api/v2/http-response.js
node --check server/api/v2/api-v2-bootstrap.js
node --check scripts/test-health-endpoints.js
node --check scripts/test-api-v2.js

echo
echo "[3/7] Bash scriptek szintaktikai ellenőrzése"

while IFS= read -r -d '' script; do
  bash -n "${script}"
done < <(
  find deploy scripts \
    -type f \
    -name '*.sh' \
    -print0
)

echo
echo "[4/7] Kötelező fájlok ellenőrzése"

required_files=(
  "VERSION"
  ".editorconfig"
  ".env.example"
  "package.json"
  "package-lock.json"
  "server2_final.js"
  "server2_legacy.js"
  "server/health-bootstrap.js"
  "server/api/v2/http-error.js"
  "server/api/v2/http-response.js"
  "server/api/v2/api-v2-bootstrap.js"
  "scripts/test-health-endpoints.js"
  "scripts/test-api-v2.js"
  "docs/api/API_V2_CONTRACT.md"
  "desktop-tauri/package.json"
  "desktop-tauri/package-lock.json"
  "desktop-tauri/src-tauri/Cargo.toml"
  "desktop-tauri/src-tauri/tauri.conf.json"
  "fejlesztes_readme.md"
  "deploy/ensure-node-dependencies.sh"
  "deploy/update.sh"
)

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || {
    echo "HIBA: hiányzik: ${file}" >&2
    exit 1
  }
done

echo
echo "[5/7] Health endpoint smoke teszt"
node scripts/test-health-endpoints.js

echo
echo "[6/7] API v2 smoke teszt"
node scripts/test-api-v2.js

echo
echo "[7/7] Titkos fájlok ellenőrzése"

if git ls-files |
  grep -E \
    '(^|/)(secrets\.h|\.env|connection\.json)$' \
    >/dev/null; then
  echo \
    "HIBA: titkos vagy helyi konfigurációs fájl van Git-követés alatt:" \
    >&2

  git ls-files |
    grep -E \
      '(^|/)(secrets\.h|\.env|connection\.json)$' \
      >&2

  exit 1
fi

echo
echo "A repository alapellenőrzése sikeres."
