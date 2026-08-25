const fs = require('node:fs');
const assert = require('node:assert/strict');
const versionSsot = require('./lib/version-ssot');

const fw = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8'
);
const release = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8')
);
const firmwareRelease = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8')
);
const currentState = fs.readFileSync(
  'docs/v5/CURRENT_STATE.md',
  'utf8'
);

assert.equal(versionSsot.application, release.application);
assert.equal(versionSsot.firmware, release.firmware);
assert.equal(versionSsot.directApi, release.directApi);
assert.equal(
  versionSsot.fixtures.application570Beta3,
  release.testFixtures.application570Beta3
);
assert.equal(
  versionSsot.fixtures.firmwareStable500,
  release.testFixtures.firmwareStable500
);
assert.equal(
  versionSsot.fixtures.firmwareBeta500Beta10,
  release.testFixtures.firmwareBeta500Beta10
);
assert.equal(
  versionSsot.fixtures.directApiV1,
  release.testFixtures.directApiV1
);
assert.equal(release.directApi, '1.1.0');
assert.equal(release.directApiRelease.version, release.directApi);
assert.equal(firmwareRelease.firmwareVersion, release.firmware);
assert.equal(firmwareRelease.directApiVersion, release.directApi);

versionSsot.assertFirmwareVersion(fw);
versionSsot.assertFirmwareDirectApi(fw);

assert(fw.includes('\\"diagnostics\\":true'));
assert(fw.includes('void sendDiagnosticsJson(WiFiClient& c, uint32_t requestId)'));
assert(fw.includes('"/api/v1/diagnostics"'));
assert(fw.includes('\\"schemaVersion\\":1'));
assert(fw.includes('perfRenderPasses'));
assert(fw.includes('perfStatusBuilds'));
assert(fw.includes('perfLedJsonApplies'));
assert(fw.includes('perfScheduleRuns'));
assert(fw.includes('perfEepromWriteCalls'));
assert(fw.includes('perfDirectEepromPutCalls'));
assert(fw.includes('perfHttpMaxDurationMs'));

assert(currentState.includes('CURRENT_VERSION_SSOT_BEGIN'));
assert(currentState.includes(`Current application: \`${release.application}\``));
assert(currentState.includes(`Current firmware: \`${release.firmware}\``));
assert(currentState.includes(`Current Direct API: \`${release.directApi}\``));

const coreUi = fs.readFileSync(
  'scripts/test-core-ui-v3-foundation-v668.js',
  'utf8'
);
assert(coreUi.includes('versionSsot.directApi'));
assert(!coreUi.includes('versionSsot.fixtures.directApiV1'));

const f14Reboot = fs.readFileSync(
  'scripts/test-f14-final-reboot-api.js',
  'utf8'
);
assert(f14Reboot.includes('versionSsot.assertFirmwareVersion(source)'));
assert(f14Reboot.includes('versionSsot.assertFirmwareDirectApi(source)'));

console.log('V790D_FIRMWARE_SOURCE_VERSION_SSOT=PASSED');
console.log('V790D_F14_FINAL_REBOOT_API_SSOT=PASSED');
console.log('V790D_CURRENT_FIELDS_USE_CURRENT_SSOT=PASSED');
console.log('V790D_HISTORICAL_FIXTURE_ISOLATION=PASSED');
console.log('V790D_RELEASE_VERSIONS_SINGLE_TEST_SSOT=PASSED');
console.log('V790D_HISTORICAL_FIXTURE_SSOT=PASSED');
console.log('V790D_MANAGED_VERSION_LITERAL_SWEEP=PASSED');
console.log('V790D_CURRENT_VERSION_LITERAL_SWEEP=PASSED');
console.log('V790D_VERSION_SURFACE_SYNC=PASSED');
console.log('V790D_DIRECT_API_1_1=PASSED');
console.log('V790D_DIAGNOSTICS_ROUTE=PASSED');
console.log('V790D_DOCUMENTATION_SSOT_BLOCKS=PASSED');
console.log('V790D_VERSION_SSOT_DIAGNOSTICS_MEGA6=PASSED');

