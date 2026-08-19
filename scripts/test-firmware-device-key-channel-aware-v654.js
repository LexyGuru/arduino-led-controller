#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');

const deviceTest=fs.readFileSync(
  'scripts/test-alpha3-device-key-header.js',
  'utf8'
);
const workflow=fs.readFileSync(
  '.github/workflows/firmware-build.yml',
  'utf8'
);
const stableWorkflow=fs.readFileSync(
  '.github/workflows/firmware-stable-release.yml',
  'utf8'
);
const versions=JSON.parse(
  fs.readFileSync('release-versions.json','utf8')
);
const release=JSON.parse(
  fs.readFileSync('firmware/firmware-release.json','utf8')
);

assert.ok(
  workflow.includes(
    'run: node scripts/test-alpha3-device-key-header.js'
  ),
  'Shared firmware builder must keep the device-key gate mandatory'
);
assert.ok(
  workflow.includes('arduino-cli compile'),
  'Shared firmware builder must still compile with arduino-cli'
);
assert.ok(
  stableWorkflow.includes(
    'uses: ./.github/workflows/firmware-build.yml'
  ),
  'Stable firmware release must use the shared firmware builder'
);

for(const token of [
  'const firmwareChannel =',
  "firmwareChannel === 'stable' || firmwareChannel === 'beta'",
  "if (firmwareChannel === 'stable')",
  "Stable firmware verzió csak tiszta x.y.z lehet",
  "Beta firmware verzió x.y.z-beta.N formátumú kell legyen",
  'release.channel',
  'versions.firmwareRelease?.channel',
]){
  assert.ok(
    deviceTest.includes(token),
    `Missing channel-aware device-key contract token: ${token}`
  );
}

assert.ok(
  !deviceTest.includes(
    'assert.match(versions.firmware, /^\\d+\\.\\d+\\.\\d+-beta\\.\\d+$/);'
  ),
  'The old unconditional Beta-only firmware assertion must be removed'
);

function validFirmwareVersion(version,channel){
  if(channel==='stable'){
    return /^\d+\.\d+\.\d+$/.test(version);
  }
  if(channel==='beta'){
    return /^\d+\.\d+\.\d+-beta\.\d+$/.test(version);
  }
  return false;
}

const cases=[
  ['5.0.0','stable',true],
  ['5.0.0-beta.10','beta',true],
  ['5.0.0','beta',false],
  ['5.0.0-beta.10','stable',false],
  ['5.0.0-rc.1','stable',false],
  ['5.0.0-rc.1','beta',false],
  ['5.0.0-alpha.1','beta',false],
];
for(const [version,channel,expected] of cases){
  assert.equal(
    validFirmwareVersion(version,channel),
    expected,
    `${version} / ${channel}`
  );
}

assert.equal(versions.firmware,'5.0.0');
assert.equal(versions.channel,'stable');
assert.equal(versions.firmwareRelease?.channel,'stable');
assert.equal(release.firmwareVersion,'5.0.0');
assert.equal(release.channel,'stable');

// Most important behavioral assertion:
// execute the exact shared gate which failed in GitHub Actions.
cp.execFileSync(
  process.execPath,
  ['scripts/test-alpha3-device-key-header.js'],
  {stdio:'inherit'}
);

console.log('FIRMWARE_DEVICE_KEY_GATE_SHARED_WORKFLOW=PASSED');
console.log('FIRMWARE_DEVICE_KEY_GATE_REAL_EXECUTION=PASSED');
console.log('FIRMWARE_STABLE_SEMVER=PASSED:5.0.0');
console.log('FIRMWARE_BETA_SEMVER_MODEL=PASSED:5.0.0-beta.10');
console.log('FIRMWARE_CHANNEL_CROSSOVER_REJECTED=PASSED');
console.log('V655_FIRMWARE_GATE_REGRESSION_HARNESS=PASSED');
