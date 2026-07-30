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

CHECKSUM_FILE="$(
  cd "$(
    dirname "${CHECKSUM_FILE}"
  )" &&
  pwd
)/$(
  basename "${CHECKSUM_FILE}"
)"

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$(
      dirname "${CHECKSUM_FILE}"
    )"

    sha256sum \
      --check \
      "$(
        basename "${CHECKSUM_FILE}"
      )"
  )
elif command -v shasum >/dev/null 2>&1; then
  (
    cd "$(
      dirname "${CHECKSUM_FILE}"
    )"

    shasum \
      -a 256 \
      -c \
      "$(
        basename "${CHECKSUM_FILE}"
      )"
  )
else
  echo 'HIBA: sem sha256sum, sem shasum nem található.' >&2
  exit 1
fi

WORK_DIR="$(
  mktemp -d
)"
trap 'rm -rf "${WORK_DIR}"' EXIT

tar -xzf \
  "${ARCHIVE}" \
  -C "${WORK_DIR}"

# Bash 3.2 kompatibilis gyökérkönyvtár-ellenőrzés.
# A Bash 4 tömbbeolvasó beépített parancsai macOS rendszer-Bash alatt nem érhetők el.
ROOT=""
ROOT_COUNT=0

while IFS= read -r candidate; do
  ROOT_COUNT=$((ROOT_COUNT + 1))

  if [[ "${ROOT_COUNT}" -eq 1 ]]; then
    ROOT="${candidate}"
  fi
done < <(
  find "${WORK_DIR}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -print
)

[[ "${ROOT_COUNT}" -eq 1 && -n "${ROOT}" ]] || {
  echo 'HIBA: az archive pontosan egy gyökérkönyvtárat tartalmazzon.' >&2
  exit 1
}

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

node - \
  "${ROOT}" \
  <<'NODE'
const fs = require('fs');
const path = require('path');

const root =
  process.argv[2];
const metadata =
  JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        'RELEASE-METADATA.json'
      ),
      'utf8'
    )
  );

const pkg =
  JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        'package.json'
      ),
      'utf8'
    )
  );

const version =
  fs.readFileSync(
    path.join(
      root,
      'VERSION'
    ),
    'utf8'
  ).trim();

if (
  metadata.version !== version ||
  pkg.version !== version
) {
  throw new Error(
    'A release verziók eltérnek.'
  );
}

if (
  !/^[a-f0-9]{40}$/
    .test(
      String(
        metadata.commit ||
        ''
      )
    )
) {
  throw new Error(
    'Érvénytelen release commit.'
  );
}

if (
  ![
    'staging',
    'promotion'
  ].includes(
    metadata.phase
  )
) {
  throw new Error(
    'Érvénytelen release phase.'
  );
}

const expectedName =
  `arduino-led-controller-${version}-${metadata.phase}-${metadata.commit.slice(
    0,
    12
  )}`;

if (
  metadata.name !==
  expectedName
) {
  throw new Error(
    `Eltérő release név: ${metadata.name}`
  );
}

if (
  path.basename(root) !==
  metadata.name
) {
  throw new Error(
    'Az archive gyökérkönyvtára és a metadata.name eltér.'
  );
}

console.log(
  `OK: release ${metadata.version} ${metadata.phase} (${metadata.commit.slice(
    0,
    12
  )})`
);
NODE

echo 'A verziózott release bundle ellenőrzése sikeres.'
