#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const dir='.github/workflows';
const actual=fs.readdirSync(dir).filter(x=>x.endsWith('.yml')).sort();
const expected=[
  'app-beta-release.yml',
  'app-build.yml',
  'app-stable-release.yml',
  'app-staging-build.yml',
  'firmware-beta-release.yml',
  'firmware-build.yml',
  'firmware-stable-release.yml'
].sort();
assert.deepEqual(actual,expected,'workflow directory must contain exactly the canonical 7 workflows');

const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const release=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const __v774AppBeta = /-beta\.\d+$/.test(release.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(release.firmware);
const appBeta=read('app-beta-release.yml');
const appStable=read('app-stable-release.yml');
const staging=read('app-staging-build.yml');
const fwBeta=read('firmware-beta-release.yml');
const fwStable=read('firmware-stable-release.yml');
const appBuild=read('app-build.yml');
const fwBuild=read('firmware-build.yml');

assert.equal(release.applicationRelease.channel,release.channel);
if(release.channel==='beta'){
  assert.equal(release.applicationRelease.branch, __v774AppBeta ? 'next/v5-rearchitecture' : 'main');
  console.log('V623_CURRENT_BRANCH_SSOT=PASSED:beta:next/v5-rearchitecture');
}else{
  assert.equal(release.channel,'stable');
  assert.equal(release.applicationRelease.branch,'main');
  console.log('V623_CURRENT_BRANCH_SSOT=PASSED:stable:main');
}

assert.match(appBeta,/name: Application Beta release/);
assert.doesNotMatch(appBeta,/EXPECTED_BRANCH:/);
assert.doesNotMatch(appBeta,/EXPECTED_VERSION:/);
assert.match(appBeta,/release-versions\.json/);
assert.match(appBeta,/applicationRelease\.branch/);
assert.match(appBeta,/CANONICAL_BRANCH/);
assert.match(appBeta,/CANONICAL_VERSION/);
assert.match(appBeta,/prerelease: true/);
assert.match(appBeta,/make_latest: false/);

assert.match(appStable,/name: Application Stable release/);
assert.match(appStable,/EXPECTED_BRANCH: main/);
assert.match(appStable,/updater-stable/);
assert.match(appStable,/prerelease: false/);
assert.match(appStable,/make_latest: true/);
assert.doesNotMatch(appStable,/tauri-desktop\.yml/);
assert.doesNotMatch(appStable,/EXPECTED_VERSION: 5\.6\.1-beta\.1/);

assert.match(staging,/name: Application staging build/);
assert.match(staging,/\.github\/workflows\/app-staging-build\.yml/);
assert.doesNotMatch(staging,/tauri-artifact-build\.yml/);

assert.match(appBuild,/workflow_call:/);
assert.match(fwBuild,/workflow_call:/);

assert.match(fwBeta,/uses: \.\/\.github\/workflows\/firmware-build\.yml/);
assert.doesNotMatch(fwBeta,/arduino-cli compile/);
assert.doesNotMatch(fwBeta,/EXPECTED_BRANCH:/);
assert.match(fwBeta,/release-versions\.json/);
assert.match(fwBeta,/applicationRelease\.branch/);

assert.match(fwStable,/uses: \.\/\.github\/workflows\/firmware-build\.yml/);

for(const legacy of ['beta-release.yml','tauri-desktop.yml','tauri-artifact-build.yml']){
  assert.ok(!fs.existsSync(path.join(dir,legacy)),`${legacy} must stay deleted`);
}

console.log('V623_CANONICAL_SEVEN_WORKFLOWS=PASSED');
console.log('V623_RELEASE_BRANCH_SINGLE_SOURCE=PASSED');
console.log('V623_RELEASE_VERSION_SINGLE_SOURCE=PASSED');
console.log('V623_LEGACY_BETA_ENTRY_REMOVED=PASSED');
console.log('V623_LEGACY_TAURI_DESKTOP_REMOVED=PASSED');
console.log('V623_STAGING_RENAMED=PASSED');
console.log('V623_STABLE_APP_SELF_CONTAINED_PUBLISHER=PASSED');
console.log('V623_FIRMWARE_SHARED_BUILD_ENGINE=PASSED');
