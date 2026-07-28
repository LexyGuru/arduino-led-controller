#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="feature/v5-repository-foundation"
VERSION_VALUE="5.0.0-alpha.1"

fail() {
  printf 'HIBA: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '\n==> %s\n' "$*"
}

git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
  fail "Nem Git repositoryban vagy."

CURRENT_BRANCH="$(git branch --show-current)"
[[ "${CURRENT_BRANCH}" == "${EXPECTED_BRANCH}" ]] ||
  fail "Hibás branch: ${CURRENT_BRANCH}. Várt branch: ${EXPECTED_BRANCH}"

[[ -z "$(git status --porcelain)" ]] ||
  fail "A munkakönyvtár nem tiszta. Előbb commitold vagy tedd félre a módosításokat."

command -v python3 >/dev/null 2>&1 ||
  fail "A python3 nem található."

log "Könyvtárak létrehozása"
mkdir -p scripts docs/baseline

log "VERSION létrehozása"
printf '%s\n' "${VERSION_VALUE}" > VERSION

log ".editorconfig létrehozása"
cat > .editorconfig <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.{sh,bash}]
indent_size = 2

[*.py]
indent_size = 4

[*.{rs,toml}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
EOF

log "Verziófájlok frissítése"
python3 <<'PY'
from __future__ import annotations

import json
import re
from pathlib import Path

version = Path("VERSION").read_text(encoding="utf-8").strip()
if not version:
    raise SystemExit("A VERSION fájl üres.")

json_files = [
    Path("package.json"),
    Path("desktop-tauri/package.json"),
    Path("desktop-tauri/src-tauri/tauri.conf.json"),
]

for path in json_files:
    if not path.exists():
        raise SystemExit(f"Hiányzó fájl: {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = version
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

cargo_path = Path("desktop-tauri/src-tauri/Cargo.toml")
cargo_text = cargo_path.read_text(encoding="utf-8")

pattern = re.compile(
    r"(?ms)(^\[package\]\s*.*?^version\s*=\s*)\"[^\"]+\""
)

updated, count = pattern.subn(
    lambda match: f'{match.group(1)}"{version}"',
    cargo_text,
    count=1,
)

if count != 1:
    raise SystemExit("Nem sikerült frissíteni a Cargo.toml [package] verzióját.")

cargo_path.write_text(updated, encoding="utf-8")
PY

log "Verzióellenőrző script létrehozása"
cat > scripts/check-versions.py <<'PY'
#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_version_file() -> str:
    path = ROOT / "VERSION"
    if not path.exists():
        raise RuntimeError("Hiányzik a VERSION fájl.")

    value = path.read_text(encoding="utf-8").strip()
    if not value:
        raise RuntimeError("A VERSION fájl üres.")

    return value


def read_json_version(relative_path: str) -> str:
    path = ROOT / relative_path
    data = json.loads(path.read_text(encoding="utf-8"))

    value = data.get("version")
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"Hiányzó vagy hibás version mező: {relative_path}")

    return value


def read_cargo_version(relative_path: str) -> str:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")

    match = re.search(
        r"(?ms)^\[package\]\s*.*?^version\s*=\s*\"([^\"]+)\"",
        text,
    )
    if not match:
        raise RuntimeError(f"Nem található [package] version: {relative_path}")

    return match.group(1)


def main() -> int:
    expected = read_version_file()

    versions = {
        "VERSION": expected,
        "package.json": read_json_version("package.json"),
        "desktop-tauri/package.json": read_json_version(
            "desktop-tauri/package.json"
        ),
        "desktop-tauri/src-tauri/Cargo.toml": read_cargo_version(
            "desktop-tauri/src-tauri/Cargo.toml"
        ),
        "desktop-tauri/src-tauri/tauri.conf.json": read_json_version(
            "desktop-tauri/src-tauri/tauri.conf.json"
        ),
    }

    mismatches = {
        path: value
        for path, value in versions.items()
        if value != expected
    }

    print(f"Elvárt projektverzió: {expected}")
    for path, value in versions.items():
        status = "OK" if value == expected else "ELTÉRÉS"
        print(f"{status:8} {path}: {value}")

    if mismatches:
        print("\nHIBA: a projekt verziófájljai nem egyeznek.", file=sys.stderr)
        return 1

    print("\nMinden projektverzió egyezik.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"HIBA: {exc}", file=sys.stderr)
        raise SystemExit(1)
PY

chmod +x scripts/check-versions.py

log "Repository-ellenőrző script létrehozása"
cat > scripts/validate-repository.sh <<'EOF'
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
EOF

chmod +x scripts/validate-repository.sh

log "Root package.json scriptek frissítése"
python3 <<'PY'
import json
from pathlib import Path

path = Path("package.json")
data = json.loads(path.read_text(encoding="utf-8"))

scripts = data.setdefault("scripts", {})
scripts["check:versions"] = "python3 scripts/check-versions.py"
scripts["validate"] = "bash scripts/validate-repository.sh"

path.write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
PY

log "Baseline dokumentum vázának létrehozása"
cat > docs/baseline/BASELINE_2026-07-28.md <<'EOF'
# Arduino LED Controller – kiindulási állapot

**Rögzítés dátuma:** 2026-07-28  
**Kiindulási ág:** `main`  
**Biztonsági tag:** `baseline-before-v5-2026-07-28`  
**Újratervezési ág:** `next/v5-rearchitecture`

## Jelenlegi komponensek

- Arduino UNO R4 WiFi firmware
- Node.js/LXC webszerver és gateway
- Tauri 2 + Rust backend
- React frontend
- Android és iOS Tauri build
- GitHub Actions firmware- és alkalmazásbuild

## Jelenlegi stabilitási problémák

- root tulajdonú `node_modules` után az LXC javítás hibára futhat;
- a szerverfrissítés csak systemd-aktivitást ellenőriz;
- a WebSocket hitelesítés és webbiztonság szigorításra szorul;
- több komponens verziókezelése eddig külön történt;
- a fő szerver- és Rust-fájlok túl nagy monolitok;
- régi és új schedule/API megoldások párhuzamosan lehetnek jelen.

## Visszaállítás

A jelenlegi stabil rendszer alapja:

```text
baseline-before-v5-2026-07-28
```

A produkciós LXC továbbra is a `main` ágat használja.
EOF

log "Ellenőrzések futtatása"
python3 scripts/check-versions.py
bash scripts/validate-repository.sh

log "Package lock előkészítése"
npm install --package-lock-only --ignore-scripts --no-audit --no-fund

if [[ -f desktop-tauri/package.json ]]; then
  (
    cd desktop-tauri
    npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  )
fi

log "Végső ellenőrzés"
bash scripts/validate-repository.sh

printf '\nElkészült. Nézd át a módosításokat:\n'
printf '  git status\n'
printf '  git diff --stat\n'
printf '  git diff\n'
