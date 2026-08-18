#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const version = read('VERSION').trim();
const match = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
assert.ok(match, `Unsupported current Beta version: ${version}`);

const [, major, minor, , betaNumber] = match;
const docPrefix =
  major === '5' && minor === '0'
    ? `BETA${betaNumber}`
    : `V${major}${minor}_BETA${betaNumber}`;

const release = JSON.parse(read('release-versions.json'));
const panel = read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const fwPage = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');
const fwBuild = read('.github/workflows/firmware-build.yml');
const fwStable = read('.github/workflows/firmware-stable-release.yml');

assert.equal(release.application, version);
assert.equal(release.applicationRelease.version, version);
assert.equal(release.applicationRelease.channel, 'beta');
assert.equal(release.applicationRelease.branch, 'next/v5-rearchitecture');
assert.equal(release.applicationRelease.updaterAlias, 'updater-beta');
assert.equal(release.applicationRelease.releaseType, 'prerelease');
assert.match(release.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(release.firmwareRelease.channel, 'beta');

const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const appBetaWorkflow = read('.github/workflows/app-beta-release.yml');
assert.match(appBetaWorkflow, new RegExp(`EXPECTED_VERSION:\\s*${escapedVersion}`));
assert.equal(fs.existsSync('.github/workflows/beta-release.yml'), false);

for (const p of [
  `RELEASE_NOTES_${version}.md`,
  `docs/v5/${docPrefix}_RELEASE_NOTES.md`,
  `docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`,
  `docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`
]) {
  assert.equal(fs.existsSync(p), true, p);
}

const readme = read('README.md');
assert.ok(readme.includes(version));
assert.ok(readme.includes(`docs/v5/${docPrefix}_RELEASE_NOTES.md`));
assert.ok(readme.includes(`RELEASE_NOTES_${version}.md`));

for (const generated of [
  'desktop-tauri/src/api/generated/api-v2-types.ts',
  'desktop-tauri/src/api/generated/api-v2-operations.ts',
  'desktop-tauri/src/api/generated/api-v2-client.ts'
]) {
  assert.match(read(generated), new RegExp(`OpenAPI verzió: ${escapedVersion}`));
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

console.log(`V617_CURRENT_BETA_APP_VERSION=PASSED:${version}`);
console.log(`V617_CURRENT_RELEASE_DOC_PREFIX=PASSED:${docPrefix}`);
console.log('V617_CHANNEL_IDENTITY_UI=PASSED');
console.log('V617_FIRMWARE_BUILD_IS_CI_ONLY=PASSED');
console.log('V617_STABLE_FIRMWARE_WORKFLOW_FOUNDATION=PASSED');
