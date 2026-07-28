#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[1/4] Verziók ellenőrzése"
python3 scripts/check-versions.py

echo
echo "[2/4] Node.js szerver szintaktikai ellenőrzése"
node --check server2_final.js

echo
echo "[3/4] Kötelező fájlok ellenőrzése"
required_files=(
  "VERSION"
  ".editorconfig"
  "package.json"
  "desktop-tauri/package.json"
  "desktop-tauri/src-tauri/Cargo.toml"
  "desktop-tauri/src-tauri/tauri.conf.json"
  "fejlesztes_readme.md"
)

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || {
    echo "HIBA: hiányzik: ${file}" >&2
    exit 1
  }
done

echo
echo "[4/4] Titkos fájlok ellenőrzése"
if git ls-files | grep -E '(^|/)(secrets\.h|\.env|connection\.json)$' >/dev/null; then
  echo "HIBA: titkos vagy helyi konfigurációs fájl van Git-követés alatt:" >&2
  git ls-files | grep -E '(^|/)(secrets\.h|\.env|connection\.json)$' >&2
  exit 1
fi

echo
echo "A repository alapellenőrzése sikeres."
