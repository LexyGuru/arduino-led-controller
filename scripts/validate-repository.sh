#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
required=(README.md CHANGELOG.md SECURITY.md CONTRIBUTING.md VERSION package.json firmware/ArduinoLedController/ArduinoLedController.ino firmware/ArduinoLedController/secrets.example.h firmware/README.md docs/firmware/FIRMWARE_4_3_0_BETA_1.md docs/firmware/DIRECT_API_V1.md docs/firmware/EEPROM_STORAGE.md docs/firmware/OTA_UPDATE.md docs/firmware/TESTING.md docs/v5/V5_IMPLEMENTATION_STATUS.md docs/v5/V5_REARCHITECTURE_CHECKLIST.md)
for f in "${required[@]}"; do test -f "$f" || { echo "HIBA: hiányzik: $f"; exit 1; }; done
! find . -path ./.git -prune -o -type f \( -name .DS_Store -o -name '*.bin' -o -name '*.elf' -o -name '*.hex' -o -name '*.log' \) -print | grep -q . || { echo 'HIBA: szemét/build fájl'; exit 1; }
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ! git ls-files | grep -Eq '(^|/)(secrets\.h|\.env|.*\.pem|.*\.p12|.*\.jks)$' || { echo 'HIBA: titkos fájl trackelve'; exit 1; }
fi
grep -q '#define FIRMWARE_VERSION "4.3.0-beta.2"' firmware/ArduinoLedController/ArduinoLedController.ino
grep -q '#define DIRECT_API_VERSION "1.0.0"' firmware/ArduinoLedController/ArduinoLedController.ino
grep -q '#define API_ALLOW_QUERY_KEY_FALLBACK 0' firmware/ArduinoLedController/ArduinoLedController.ino
grep -q 'case 202: return "202 Accepted"' firmware/ArduinoLedController/ArduinoLedController.ino
node scripts/test-v5-documentation-status.js
node scripts/test-beta-release-workflow.js
node scripts/test-f14-final-reboot-api.js
echo 'REPOSITORY_VALIDATION=PASSED'
