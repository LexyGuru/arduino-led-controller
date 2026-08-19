#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const version = read('VERSION').trim();
const versions = JSON.parse(read('release-versions.json'));
const firmwareMeta = JSON.parse(read('firmware/firmware-release.json'));
const firmwareSource = read('firmware/ArduinoLedController/ArduinoLedController.ino');
const packageJson = JSON.parse(read('package.json'));

assert.equal(versions.application, version);
assert.equal(firmwareMeta.firmwareVersion, versions.firmware);
assert.equal(firmwareMeta.directApiVersion, versions.directApi);
assert.ok(
  firmwareSource.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`),
  'Firmware source version must match canonical firmware version',
);
assert.ok(
  firmwareSource.includes(`#define DIRECT_API_VERSION "${versions.directApi}"`),
  'Firmware Direct API version must match canonical Direct API version',
);

const isBeta = versions.channel === 'beta';
let appWorkflowPath;
let firmwareWorkflowPath;
let docPrefix;

if (isBeta) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
  assert.ok(m, 'Current Beta product version cannot be derived');
  const [, major, minor, , betaNumber] = m;
  docPrefix =
    major === '5' && minor === '0'
      ? `BETA${betaNumber}`
      : `V${major}${minor}_BETA${betaNumber}`;

  assert.match(versions.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
  assert.equal(versions.applicationRelease.channel, 'beta');
  assert.equal(versions.applicationRelease.branch, 'next/v5-rearchitecture');
  assert.equal(versions.applicationRelease.updaterAlias, 'updater-beta');
  assert.equal(versions.applicationRelease.releaseType, 'prerelease');
  assert.equal(versions.firmwareRelease.channel, 'beta');
  assert.equal(versions.firmwareRelease.releaseFamily, 'firmware-beta');

  appWorkflowPath = '.github/workflows/app-beta-release.yml';
  firmwareWorkflowPath = '.github/workflows/firmware-beta-release.yml';
} else {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(m, 'Current Stable product version cannot be derived');
  const [, major, minor] = m;
  docPrefix = `V${major}${minor}_STABLE`;

  assert.match(versions.firmware, /^\d+\.\d+\.\d+$/);
  assert.equal(versions.channel, 'stable');
  assert.equal(versions.applicationRelease.channel, 'stable');
  assert.equal(versions.applicationRelease.branch, 'main');
  assert.equal(versions.applicationRelease.updaterAlias, 'updater-stable');
  assert.equal(versions.applicationRelease.releaseType, 'release');
  assert.equal(versions.firmwareRelease.channel, 'stable');
  assert.equal(versions.firmwareRelease.releaseFamily, 'firmware-stable');

  appWorkflowPath = '.github/workflows/app-stable-release.yml';
  firmwareWorkflowPath = '.github/workflows/firmware-stable-release.yml';
}

const appWorkflow = read(appWorkflowPath);
const firmwareWorkflow = read(firmwareWorkflowPath);

// Current release documentation must be present for both channels.
for (const kind of ['INSTALLATION_GUIDE', 'RELEASE_NOTES', 'RELEASE_CHECKLIST']) {
  const path = `docs/v5/${docPrefix}_${kind}.md`;
  assert.equal(fs.existsSync(path), true, `Missing current release document: ${path}`);
}

// Common application release separation contract.
assert.match(appWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(appWorkflow, /\n  push:/);
assert.match(appWorkflow, /npm test/);
assert.match(appWorkflow, /validate-repository\.sh/);
assert.match(appWorkflow, /Enforce application-only release assets/);
assert.match(appWorkflow, /doc_prefix:/);
assert.match(appWorkflow, /needs\.validate\.outputs\.doc_prefix/);
assert.doesNotMatch(appWorkflow, /gh workflow run firmware-(?:beta|stable)-release\.yml/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(appWorkflow, /firmware-latest/);

assert.equal(
  packageJson.scripts['test:beta-installation-assets'],
  'node scripts/test-v55-current-release-contract-v334.js && node scripts/test-v55-staging-runtime-normalization-v334.js',
  'Installation-assets alias must remain mapped to maintained channel-aware contracts',
);

for (const kind of ['INSTALLATION_GUIDE', 'RELEASE_NOTES', 'RELEASE_CHECKLIST']) {
  assert.ok(
    appWorkflow.includes(`docs/v5/\${DOC_PREFIX}_${kind}.md`),
    `Application workflow dynamic release-doc copy missing: ${kind}`,
  );
  assert.ok(
    appWorkflow.includes(`release-assets/\${DOC_PREFIX}_${kind}.md`),
    `Application workflow dynamic release-doc verify missing: ${kind}`,
  );
}

// Common firmware publication separation contract.
assert.match(firmwareWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(firmwareWorkflow, /build-desktop:/);
assert.doesNotMatch(firmwareWorkflow, /build-android:/);
assert.doesNotMatch(firmwareWorkflow, /build-ios:/);
assert.doesNotMatch(firmwareWorkflow, /build-lxc:/);
assert.match(firmwareWorkflow, /uses: \.\/\.github\/workflows\/firmware-build\.yml/);
assert.match(firmwareWorkflow, /Arduino_LED_Controller_Firmware_\$\{FW_VERSION\}_UNO_R4_WiFi\.bin/);
assert.match(firmwareWorkflow, /firmware-catalog\.json/);
assert.match(firmwareWorkflow, /npm run test:ntp-timezone-contract/);

if (isBeta) {
  // Beta application specifics.
  assert.match(appWorkflow, /npm run test:beta-installation-assets/);
  assert.match(appWorkflow, /prerelease: true/);
  assert.match(appWorkflow, /make_latest: false/);

  // Beta firmware gate is richer: API identity + migration + immutable history.
  assert.match(firmwareWorkflow, /name: Build UNO R4 WiFi firmware/);
  assert.match(firmwareWorkflow, /FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/);
  assert.match(
    firmwareWorkflow,
    /FW_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.firmware"\)"/,
  );
  assert.match(
    firmwareWorkflow,
    /API_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.directApi"\)"/,
  );
  assert.match(firmwareWorkflow, /SOURCE_API_VERSION=/);
  assert.match(firmwareWorkflow, /META_API_VERSION=/);
  assert.match(firmwareWorkflow, /test "\$\{API_VERSION\}" = "\$\{SOURCE_API_VERSION\}"/);
  assert.match(firmwareWorkflow, /test "\$\{API_VERSION\}" = "\$\{META_API_VERSION\}"/);
  assert.match(firmwareWorkflow, /Migrate verified legacy firmware assets/);
  assert.match(firmwareWorkflow, /Remove firmware assets from application releases after migration/);
  assert.match(firmwareWorkflow, /Preserve immutable published firmware assets/);
  assert.match(firmwareWorkflow, /FIRMWARE-SHA256SUMS/);
  assert.match(firmwareWorkflow, /npm run test:firmware-430-beta4-scheduler-hotfix/);
  assert.match(firmwareWorkflow, /--prerelease/);

  console.log('BETA_RELEASE_WORKFLOW_CONTRACT=PASSED');
} else {
  // Stable application specifics.
  assert.doesNotMatch(appWorkflow, /npm run test:beta-installation-assets/);
  assert.match(appWorkflow, /npm run test:release-architecture-v2/);
  assert.match(appWorkflow, /npm run test:release-workflow-architecture-v2/);
  assert.match(appWorkflow, /npm run test:macos-ota-immutable/);
  assert.match(appWorkflow, /make_latest: true/);
  assert.doesNotMatch(appWorkflow, /prerelease: true/);

  // Stable firmware uses the shared build workflow and Stable-only metadata/catalog rules.
  assert.match(firmwareWorkflow, /name: Build Stable UNO R4 WiFi firmware/);
  assert.match(firmwareWorkflow, /FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_STABLE/);
  assert.match(
    firmwareWorkflow,
    /FW_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.firmwareRelease\.recommendedVersion"\)"/,
  );
  assert.match(firmwareWorkflow, /test "\$\{GITHUB_REF_NAME\}" = "main"/);
  assert.match(firmwareWorkflow, /r\.channel!='stable'|r\.channel!=='stable'/);
  assert.match(firmwareWorkflow, /firmwareRelease\?\.channel!='stable'|firmwareRelease\?\.channel!=='stable'/);
  assert.match(firmwareWorkflow, /!\s*printf .*alpha\|beta\|rc/);
  assert.match(firmwareWorkflow, /"channel":"stable"/);
  assert.match(firmwareWorkflow, /Empty Stable firmware catalog/);
  assert.match(firmwareWorkflow, /isPrerelease.*false/);
  assert.doesNotMatch(firmwareWorkflow, /FIRMWARE-SHA256SUMS/);
  assert.doesNotMatch(firmwareWorkflow, /Migrate verified legacy firmware assets/);
  assert.doesNotMatch(firmwareWorkflow, /Remove firmware assets from application releases after migration/);

  console.log('STABLE_RELEASE_WORKFLOW_CONTRACT=PASSED');
}

console.log(
  `OK: application ${versions.application}, firmware ${versions.firmware}, Direct API ${versions.directApi} ${versions.channel} workflow contract`,
);
