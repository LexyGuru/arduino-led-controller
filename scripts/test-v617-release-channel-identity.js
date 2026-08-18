#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const version = read('VERSION').trim();
const release = JSON.parse(read('release-versions.json'));
const panel = read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const fwPage = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');
const fwBuild = read('.github/workflows/firmware-build.yml');
const fwStable = read('.github/workflows/firmware-stable-release.yml');

assert.equal(version, '5.6.1-beta.1');
assert.equal(release.application, '5.6.1-beta.1');
assert.equal(release.applicationRelease.channel, 'beta');
assert.equal(release.applicationRelease.branch, 'next/v5-rearchitecture');
assert.equal(release.firmware, '5.0.0-beta.10');
assert.equal(release.firmwareRelease.channel, 'beta');

const appBetaWorkflow = read('.github/workflows/app-beta-release.yml');
assert.match(appBetaWorkflow, /EXPECTED_VERSION:\s*5\.6\.1-beta\.1/);
assert.equal(fs.existsSync('.github/workflows/beta-release.yml'), false);
for (const p of [
  'RELEASE_NOTES_5.6.1-beta.1.md',
  'docs/v5/V56_BETA1_RELEASE_NOTES.md',
  'docs/v5/V56_BETA1_INSTALLATION_GUIDE.md',
  'docs/v5/V56_BETA1_RELEASE_CHECKLIST.md'
]) {
  assert.equal(fs.existsSync(p), true, p);
}
const stagingEnv = read('deploy/staging.env.example');
assert.match(stagingEnv, /^RELEASE_TARGET_VERSION=5\.6\.1-beta\.1$/m);
assert.match(stagingEnv, /^RELEASE_CANDIDATE=beta\.1-gate$/m);
const readme = read('README.md');
assert.match(readme, /Jelenlegi fejlesztési kiadás: Arduino LED Controller V5\.6 Beta\.1/);
assert.match(readme, /Alkalmazás \| \*\*`5\.6\.1-beta\.1`\*\*/);
assert.match(readme, /docs\/v5\/V56_BETA1_RELEASE_NOTES\.md/);
assert.match(readme, /RELEASE_NOTES_5\.6\.1-beta\.1\.md/);

for (const generated of [
  'desktop-tauri/src/api/generated/api-v2-types.ts',
  'desktop-tauri/src/api/generated/api-v2-operations.ts',
  'desktop-tauri/src/api/generated/api-v2-client.ts'
]) {
  assert.match(read(generated), /OpenAPI verzió: 5\.6\.1-beta\.1/);
}

assert.match(panel, /function channelFromVersion/);
assert.match(panel, /appBuildChannel/);
assert.match(panel, /firmwareBuildChannel/);
assert.match(panel, /appSelectedChannel = appUpdate\.channel/);
assert.match(panel, /firmwareSelectedChannel/);
assert.match(panel, /channelIdentity\.appMismatch/);
assert.match(panel, /channelIdentity\.firmwareMismatch/);
assert.doesNotMatch(panel, /\{firmware\?\.updateChannel \?\? t\('common\.unknown'\)\}/);

assert.match(fwPage, /const selectedFirmwareChannel = firmwareUpdateChannel/);
assert.match(fwPage, /restoreVersions[\s\S]*selectedFirmwareChannel === 'stable'[\s\S]*'Stable'[\s\S]*'Beta'/);
assert.doesNotMatch(fwPage, /restoreVersions[\s\S]{0,180}firmware\?\.firmwareUpdateChannel/);
assert.doesNotMatch(fwPage, /Stable \/ main/);

for (const key of [
  'channelIdentity.buildType',
  'channelIdentity.updateChannel',
  'channelIdentity.appMismatch',
  'channelIdentity.firmwareMismatch',
]) {
  assert.equal((i18n.match(new RegExp(key.replaceAll('.', '\\.'), 'g')) || []).length, 3);
}

assert.match(fwBuild, /workflow_call:/);
assert.match(fwBuild, /permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(fwBuild, /softprops\/action-gh-release/);
assert.doesNotMatch(fwBuild, /tag_name:\s*firmware-latest/);

assert.match(fwStable, /Arduino_LED_Controller_Firmware_STABLE/);
assert.match(fwStable, /uses: \.\/\.github\/workflows\/firmware-build\.yml/);
assert.match(fwStable, /channel":"stable"/);
assert.match(fwStable, /isPrerelease/);

console.log('V617_BETA_APP_VERSION_5_6_1_BETA_1=PASSED');
console.log('V617_CHANNEL_IDENTITY_UI=PASSED');
console.log('V617_FIRMWARE_BUILD_IS_CI_ONLY=PASSED');
console.log('V617_STABLE_FIRMWARE_WORKFLOW_FOUNDATION=PASSED');
