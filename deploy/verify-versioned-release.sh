#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:-}"
CHECKSUM_FILE="${2:-${ARCHIVE}.sha256}"
WORK_DIR=""

[[ -n "${ARCHIVE}" && -f "${ARCHIVE}" ]] || {
  echo 'Használat: verify-versioned-release.sh <release.tar.gz> [checksum.sha256]' >&2
  exit 1
}

[[ -f "${CHECKSUM_FILE}" ]] || {
  echo "HIBA: hiányzó checksum: ${CHECKSUM_FILE}" >&2
  exit 1
}

shasum -a 256 -c "${CHECKSUM_FILE}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

tar -xzf "${ARCHIVE}" -C "${WORK_DIR}"
ROOT="$(find "${WORK_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

for file in \
  VERSION \
  package.json \
  package-lock.json \
  server2_final.js \
  scripts/validate-repository.sh \
  RELEASE-METADATA.json; do
  [[ -f "${ROOT}/${file}" ]] || {
    echo "HIBA: hiányzó release fájl: ${file}" >&2
    exit 1
  }
done

node - "${ROOT}" <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'RELEASE-METADATA.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
if (metadata.version !== version || pkg.version !== version) process.exit(1);
if (!/^[a-f0-9]{40}$/.test(metadata.commit)) process.exit(1);
console.log(`OK: release ${metadata.version} (${metadata.commit.slice(0, 12)})`);
NODE

echo 'A verziózott release bundle ellenőrzése sikeres.'
