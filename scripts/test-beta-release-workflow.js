#!/usr/bin/env node
// V5_STABLE_BETA_WORKFLOW_COMPAT
// Stable main has no current Beta number. Preserve beta workflow/history,
// then skip Beta-only current-state derivation checks.
const __V5_CURRENT_APP_VERSION = require('../package.json').version;
if (!/-beta\.\d+$/.test(__V5_CURRENT_APP_VERSION)) {
  const __v5fs = require('fs');
  if (!__v5fs.existsSync('.github/workflows/beta-release.yml')) {
    throw new Error('Beta release workflow file is missing on stable main');
  }
  if (!__v5fs.existsSync('RELEASE_NOTES_5.0.0-beta.10.md')) {
    throw new Error('Historical Beta10 release notes are missing on stable main');
  }
  console.log('OK: stable main preserves beta workflow/history without requiring a current Beta number');
  process.exit(0);
}

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const CURRENT_APP_VERSION = fs.readFileSync('VERSION', 'utf8').trim();
const CURRENT_BETA_DOC_NUMBER = CURRENT_APP_VERSION.match(/-beta\.(\d+)$/)?.[1];
assert.ok(CURRENT_BETA_DOC_NUMBER, 'Current Beta document number cannot be derived');
const CURRENT_RELEASE_DOCS = [
  `BETA${CURRENT_BETA_DOC_NUMBER}_INSTALLATION_GUIDE.md`,
  `BETA${CURRENT_BETA_DOC_NUMBER}_RELEASE_NOTES.md`,
  `BETA${CURRENT_BETA_DOC_NUMBER}_RELEASE_CHECKLIST.md`,
];

const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8'),
);
const firmwareMeta = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8'),
);
const firmwareSource = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8',
);
const appWorkflow = fs.readFileSync(
  '.github/workflows/beta-release.yml',
  'utf8',
);
const firmwareWorkflow = fs.readFileSync(
  '.github/workflows/firmware-beta-release.yml',
  'utf8',
);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

assert.match(versions.application, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.match(versions.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(versions.channel, 'beta');
assert.ok(
  firmwareSource.includes(
    `#define FIRMWARE_VERSION "${versions.firmware}"`,
  ),
  'A firmware forrásverzió nem egyezik a központi verzióval',
);
assert.ok(
  firmwareSource.includes(
    `#define DIRECT_API_VERSION "${versions.directApi}"`,
  ),
  'A Direct API forrásverzió nem egyezik a központi verzióval',
);
assert.equal(firmwareMeta.firmwareVersion, versions.firmware);
assert.equal(firmwareMeta.directApiVersion, versions.directApi);

// Teljes alkalmazásrelease: csak alkalmazás, mobil és LXC.
assert.match(
  appWorkflow,
  new RegExp(`EXPECTED_VERSION: ${escapeRegex(versions.application)}`),
);
assert.match(appWorkflow, /next\/v5-rearchitecture/);
assert.match(appWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(appWorkflow, /\n  push:/);
assert.match(appWorkflow, /npm test/);
assert.match(appWorkflow, /validate-repository\.sh/);
assert.match(appWorkflow, /prerelease: true/);
assert.match(appWorkflow, /make_latest: false/);
assert.match(appWorkflow, /Enforce application-only release assets/);
assert.match(appWorkflow, /docs\/v5\/BETA10_RELEASE_NOTES\.md/);
assert.match(appWorkflow, /docs\/v5\/BETA10_INSTALLATION_GUIDE\.md/);
assert.match(appWorkflow, /docs\/v5\/BETA10_RELEASE_CHECKLIST\.md/);
assert.doesNotMatch(appWorkflow, /body_path: docs\/v5\/BETA6_RELEASE_NOTES\.md/);
assert.match(appWorkflow, /Dispatch and wait for dedicated firmware prerelease/);
assert.match(appWorkflow, /gh workflow run firmware-beta-release\.yml/);
assert.match(appWorkflow, /gh run watch \"\$\{RUN_ID\}\" --exit-status/);
assert.doesNotMatch(appWorkflow, /EXPECTED_FIRMWARE_VERSION:/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(
  appWorkflow,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/,
);

// Dedikált firmware workflow: minden verzió dinamikus forrásból származik.
assert.match(
  firmwareWorkflow,
  /FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/,
);
assert.match(
  firmwareWorkflow,
  /FW_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.firmware"\)"/,
);
assert.match(
  firmwareWorkflow,
  /API_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.directApi"\)"/,
);
assert.match(
  firmwareWorkflow,
  /SOURCE_VERSION="\$\(sed -nE .*FIRMWARE_VERSION.*ArduinoLedController\.ino/,
);
assert.match(
  firmwareWorkflow,
  /SOURCE_API_VERSION="\$\(sed -nE .*DIRECT_API_VERSION.*ArduinoLedController\.ino/,
);
assert.match(
  firmwareWorkflow,
  /META_VERSION="\$\(node -p "require\('\.\/firmware\/firmware-release\.json'\)\.firmwareVersion"\)"/,
);
assert.match(
  firmwareWorkflow,
  /META_API_VERSION="\$\(node -p "require\('\.\/firmware\/firmware-release\.json'\)\.directApiVersion"\)"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{SOURCE_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{META_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{API_VERSION\}" = "\$\{SOURCE_API_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{API_VERSION\}" = "\$\{META_API_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /Arduino_LED_Controller_Firmware_\$\{FW_VERSION\}_UNO_R4_WiFi\.bin/,
);
assert.match(firmwareWorkflow, /Build UNO R4 WiFi firmware/);
assert.match(firmwareWorkflow, /firmware-catalog\.json/);
assert.match(firmwareWorkflow, /FIRMWARE-SHA256SUMS/);
assert.match(
  firmwareWorkflow,
  /Migrate verified legacy firmware assets/,
);
assert.match(
  firmwareWorkflow,
  /Remove firmware assets from application releases after migration/,
);
assert.match(
  firmwareWorkflow,
  /npm run test:ntp-timezone-contract/,
);
assert.match(
  firmwareWorkflow,
  /npm run test:firmware-430-beta4-scheduler-hotfix/,
);
assert.doesNotMatch(firmwareWorkflow, /build-desktop:/);
assert.doesNotMatch(firmwareWorkflow, /build-android:/);
assert.doesNotMatch(firmwareWorkflow, /build-ios:/);
assert.doesNotMatch(firmwareWorkflow, /build-lxc:/);

assert.doesNotMatch(appWorkflow, /firmware-latest/);
assert.doesNotMatch(appWorkflow, /4\.1\.21/);
assert.doesNotMatch(
  appWorkflow,
  /EXPECTED_VERSION: 5\.0\.0-beta\.3/,
);


// WORKFLOW_CURRENT_RELEASE_DOC_DYNAMIC_GATE
for (const doc of CURRENT_RELEASE_DOCS) {
  assert.ok(
    appWorkflow.includes(`cp docs/v5/${doc} release-assets/`),
    `workflow current release-doc copy missing: ${doc}`,
  );
  assert.ok(
    appWorkflow.includes(`test -f release-assets/${doc}`),
    `workflow current release-doc verify missing: ${doc}`,
  );
}

console.log(
  `OK: alkalmazásrelease ${versions.application}, firmware ${versions.firmware}, Direct API ${versions.directApi} dinamikus workflow contract`,
);
