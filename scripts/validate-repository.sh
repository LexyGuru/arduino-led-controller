#!/usr/bin/env bash
set -Eeuo pipefail

# BEGIN BETA9 CURRENT RELEASE DOC GATE
for beta9_current_doc in \
  docs/v5/BETA9_RELEASE_CHECKLIST.md \
  docs/v5/BETA9_INSTALLATION_GUIDE.md \
  docs/v5/BETA9_RELEASE_NOTES.md
do
  if [ ! -f "${beta9_current_doc}" ]; then
    echo "HIBA: hiányzó Beta.9 current release dokumentum: ${beta9_current_doc}" >&2
    exit 1
  fi
done
# END BETA9 CURRENT RELEASE DOC GATE


cd "$(dirname "$0")/.."

required=(
  README.md
  CHANGELOG.md
  SECURITY.md
  CONTRIBUTING.md
  VERSION
  package.json
  release-versions.json
  firmware/firmware-release.json
  firmware/ArduinoLedController/ArduinoLedController.ino
  firmware/ArduinoLedController/secrets.example.h
  firmware/README.md
  docs/firmware/FIRMWARE_4_3_0_BETA_1.md
  docs/firmware/DIRECT_API_V1.md
  docs/firmware/EEPROM_STORAGE.md
  docs/firmware/OTA_UPDATE.md
  docs/firmware/TESTING.md
  docs/v5/V5_IMPLEMENTATION_STATUS.md
  docs/v5/BETA6_RELEASE_CHECKLIST.md
  docs/v5/BETA6_INSTALLATION_GUIDE.md
  docs/v5/BETA6_RELEASE_NOTES.md
  docs/v5/V5_REARCHITECTURE_CHECKLIST.md
  scripts/test-ntp-timezone-contract.js
  scripts/test-firmware-ota-production-regression.js
)

for file in "${required[@]}"; do
  test -f "${file}" || {
    echo "HIBA: hiányzik: ${file}"
    exit 1
  }
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ! git ls-files -z | tr '\0' '\n' | grep -Eq \
    '(^|/)\.DS_Store$|\.bin$|\.elf$|\.hex$|\.log$' || {
      echo 'HIBA: trackelt szemét/build fájl'
      exit 1
    }
else
  ! find . -type f \
    \( -name .DS_Store -o -name '*.bin' -o -name '*.elf' \
    -o -name '*.hex' -o -name '*.log' \) -print | grep -q . || {
      echo 'HIBA: szemét/build fájl'
      exit 1
    }
fi
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ! git ls-files | grep -Eq \
    '(^|/)(secrets\.h|\.env|.*\.pem|.*\.p12|.*\.jks)$' || {
      echo 'HIBA: titkos fájl trackelve'
      exit 1
    }
fi

EXPECTED_FIRMWARE_VERSION="$(
  node -p "JSON.parse(require('fs').readFileSync(
    'release-versions.json','utf8'
  )).firmware"
)"
EXPECTED_DIRECT_API_VERSION="$(
  node -p "JSON.parse(require('fs').readFileSync(
    'release-versions.json','utf8'
  )).directApi"
)"
META_FIRMWARE_VERSION="$(
  node -p "JSON.parse(require('fs').readFileSync(
    'firmware/firmware-release.json','utf8'
  )).firmwareVersion"
)"
META_DIRECT_API_VERSION="$(
  node -p "JSON.parse(require('fs').readFileSync(
    'firmware/firmware-release.json','utf8'
  )).directApiVersion"
)"

test "${EXPECTED_FIRMWARE_VERSION}" = "${META_FIRMWARE_VERSION}"
test "${EXPECTED_DIRECT_API_VERSION}" = "${META_DIRECT_API_VERSION}"

grep -Fq \
  "#define FIRMWARE_VERSION \"${EXPECTED_FIRMWARE_VERSION}\"" \
  firmware/ArduinoLedController/ArduinoLedController.ino
grep -Fq \
  "#define DIRECT_API_VERSION \"${EXPECTED_DIRECT_API_VERSION}\"" \
  firmware/ArduinoLedController/ArduinoLedController.ino
grep -Fq \
  '#define API_ALLOW_QUERY_KEY_FALLBACK 0' \
  firmware/ArduinoLedController/ArduinoLedController.ino
grep -Fq \
  'case 202: return "202 Accepted"' \
  firmware/ArduinoLedController/ArduinoLedController.ino

node scripts/test-ntp-timezone-contract.js
node scripts/test-firmware-ota-maintenance-mode.js
node scripts/test-firmware-ota-production-regression.js
node scripts/test-firmware-430-beta4-scheduler-hotfix.js
node scripts/test-v5-documentation-status.js
node scripts/test-beta-release-workflow.js
node scripts/test-f14-final-reboot-api.js

echo 'REPOSITORY_VALIDATION=PASSED'
