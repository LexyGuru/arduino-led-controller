#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const APP = '5.0.0-beta.9';
const FW = '5.0.0-beta.6';

const versions = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
assert(versions.application === APP, 'application version mismatch');
assert(versions.firmware === FW, 'firmware version mismatch');

const docStatus = fs.readFileSync('scripts/test-v5-documentation-status.js', 'utf8');
assert(
  docStatus.includes("read('VERSION').trim(), '5.0.0-beta.9'"),
  'documentation status app version not migrated'
);
assert(
  docStatus.includes("'4.3.0-beta.4'"),
  'historical firmware documentation marker must remain'
);

const firmwareMeta = fs.readFileSync(
  'scripts/test-beta7-firmware-metadata-contract.js', 'utf8'
);
assert(firmwareMeta.includes('5.0.0-beta.9'),
  'firmware metadata application version not Beta.8');
assert(firmwareMeta.includes('5.0.0-beta.6'),
  'firmware metadata firmware version not Beta.6');

const current = fs.readFileSync(
  'scripts/test-beta7-current-version-contract.js', 'utf8'
);
assert(current.includes('5.0.0-beta.9'),
  'current-version contract not Beta.8');
assert(current.includes('5.0.0-beta.6'),
  'current-version firmware marker missing');

const workflow = fs.readFileSync(
  'scripts/test-beta-release-workflow.js', 'utf8'
);
assert(workflow.includes('BETA8_RELEASE_NOTES'),
  'workflow test does not expect Beta.8 release notes');

const historical = fs.readFileSync(
  'scripts/test-beta6-release-package.js', 'utf8'
);
assert(historical.includes("versions.application, '5.0.0-beta.6'"),
  'historical Beta.6 contract changed unexpectedly');

console.log('BETA8_DOCUMENTATION_APP_VERSION=PASSED');
console.log('HISTORICAL_FIRMWARE_DOC_MARKER=PRESERVED');
console.log('CURRENT_FIRMWARE_VERSION=BETA6');
console.log('HISTORICAL_BETA6_CONTRACT=PRESERVED');
console.log('BETA8_DOCUMENTATION_CONTRACT_FIX=PASSED');
