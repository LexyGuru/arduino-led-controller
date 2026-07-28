#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

cd "${ROOT_DIR}"

echo "[1/9] Verziók ellenőrzése"
python3 scripts/check-versions.py

echo
echo "[2/9] Node.js fájlok szintaktikai ellenőrzése"
npm run check --silent

echo
echo "[3/9] Bash scriptek szintaktikai ellenőrzése"

while IFS= read -r -d '' script; do
  bash -n "${script}"
done < <(
  find deploy scripts \
    -type f \
    -name '*.sh' \
    -print0
)

echo
echo "[4/9] Kötelező fájlok ellenőrzése"

required_files=(
  "VERSION"
  ".editorconfig"
  ".env.example"
  "package.json"
  "package-lock.json"
  "server2_final.js"
  "server2_legacy.js"
  "server/core/runtime-paths.js"
  "server/core/config.js"
  "server/core/logger.js"
  "server/core/runtime-context.js"
  "server/arduino/arduino-error.js"
  "server/arduino/arduino-client.js"
  "server/health-bootstrap.js"
  "server/api/v2/http-error.js"
  "server/api/v2/http-response.js"
  "server/api/v2/api-v2-bootstrap.js"
  "scripts/test-core-modules.js"
  "scripts/test-arduino-client.js"
  "scripts/test-health-endpoints.js"
  "scripts/test-api-v2.js"
  "docs/api/API_V2_CONTRACT.md"
  "docs/v5/V5_REARCHITECTURE_CHECKLIST.md"
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
echo "[5/9] Core modul smoke teszt"
node scripts/test-core-modules.js

echo
echo "[6/9] Arduino kliens smoke teszt"
node scripts/test-arduino-client.js

echo
echo "[7/9] Health endpoint smoke teszt"
node scripts/test-health-endpoints.js

echo
echo "[8/9] API v2 smoke teszt"
node scripts/test-api-v2.js

echo
echo "[9/9] Titkos fájlok ellenőrzése"

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
