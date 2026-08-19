#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const CURRENT_APP_VERSION = fs.readFileSync('VERSION', 'utf8').trim();
const CURRENT_APP_MATCH = CURRENT_APP_VERSION.match(
  /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/,
);
assert.ok(CURRENT_APP_MATCH, 'Current Beta product version cannot be derived');
const [, CURRENT_MAJOR, CURRENT_MINOR, , CURRENT_BETA_DOC_NUMBER] =
  CURRENT_APP_MATCH;
const CURRENT_RELEASE_DOC_PREFIX =
  CURRENT_MAJOR === '5' && CURRENT_MINOR === '0'
    ? `BETA${CURRENT_BETA_DOC_NUMBER}`
    : `V${CURRENT_MAJOR}${CURRENT_MINOR}_BETA${CURRENT_BETA_DOC_NUMBER}`;
const CURRENT_RELEASE_DOCS = [
  `${CURRENT_RELEASE_DOC_PREFIX}_INSTALLATION_GUIDE.md`,
  `${CURRENT_RELEASE_DOC_PREFIX}_RELEASE_NOTES.md`,
  `${CURRENT_RELEASE_DOC_PREFIX}_RELEASE_CHECKLIST.md`,
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
  '.github/workflows/app-beta-release.yml',
  'utf8',
);
const firmwareWorkflow = fs.readFileSync(
  '.github/workflows/firmware-beta-release.yml',
  'utf8',
);
const packageJson = JSON.parse(
  fs.readFileSync('package.json', 'utf8'),
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
assert.doesNotMatch(appWorkflow, /EXPECTED_VERSION:/);
assert.doesNotMatch(appWorkflow, /EXPECTED_BRANCH:/);
assert.match(appWorkflow, /release-versions\.json'\)\.application/);
assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.channel/);
assert.equal(
  versions.applicationRelease.branch,
  'next/v5-rearchitecture',
  'Canonical Beta branch identity must remain next/v5-rearchitecture',
);
assert.match(appWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(appWorkflow, /\n  push:/);
assert.match(appWorkflow, /npm test/);
assert.match(
  appWorkflow,
  /npm run test:beta-installation-assets/,
  'Beta release workflow must use the maintained npm installation-assets contract alias',
);
assert.doesNotMatch(
  appWorkflow,
  /node scripts\/test-beta-installation-assets\.js/,
  'Deleted physical beta installation-assets test must never be invoked directly',
);
assert.equal(
  packageJson.scripts['test:beta-installation-assets'],
  'node scripts/test-v55-current-release-contract-v334.js && node scripts/test-v55-staging-runtime-normalization-v334.js',
  'Beta installation-assets npm alias must point to the maintained V5.5 contracts',
);
assert.match(appWorkflow, /validate-repository\.sh/);
assert.match(appWorkflow, /prerelease: true/);
assert.match(appWorkflow, /make_latest: false/);
assert.match(appWorkflow, /Enforce application-only release assets/);
assert.match(appWorkflow, /doc_prefix:/);
assert.match(appWorkflow, /needs\.validate\.outputs\.doc_prefix/);
assert.match(
  appWorkflow,
  /body_path: docs\/v5\/\$\{\{ needs\.validate\.outputs\.doc_prefix \}\}_RELEASE_NOTES\.md/,
);
assert.doesNotMatch(appWorkflow, /body_path: docs\/v5\/BETA6_RELEASE_NOTES\.md/);
assert.doesNotMatch(appWorkflow, /Dispatch and wait for dedicated firmware prerelease/);
assert.doesNotMatch(appWorkflow, /gh workflow run firmware-beta-release\.yml/);
assert.doesNotMatch(appWorkflow, /EXPECTED_FIRMWARE_VERSION:/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(
  appWorkflow,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/,
);

// Dedikált firmware workflow: minden verzió dinamikus forrásból származik.
assert.doesNotMatch(firmwareWorkflow, /EXPECTED_BRANCH:/);
assert.match(firmwareWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
assert.match(firmwareWorkflow, /release-versions\.json'\)\.firmwareRelease\.channel/);
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
    fs.existsSync(`docs/v5/${doc}`),
    `current release document missing: ${doc}`,
  );
}
for (const kind of [
  'INSTALLATION_GUIDE',
  'RELEASE_NOTES',
  'RELEASE_CHECKLIST',
]) {
  assert.ok(
    appWorkflow.includes(`docs/v5/\${DOC_PREFIX}_${kind}.md`),
    `workflow dynamic release-doc copy missing: ${kind}`,
  );
  assert.ok(
    appWorkflow.includes(`release-assets/\${DOC_PREFIX}_${kind}.md`),
    `workflow dynamic release-doc verify missing: ${kind}`,
  );
}

console.log(
  `OK: alkalmazásrelease ${versions.application}, firmware ${versions.firmware}, Direct API ${versions.directApi} dinamikus workflow contract`,
);
