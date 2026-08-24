#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const r = JSON.parse(read('release-versions.json'));
const __v774AppBeta = /-beta\.\d+$/.test(r.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(r.firmware);

for (const f of [
  'app-beta-release.yml',
  'app-stable-release.yml',
  'firmware-beta-release.yml',
  'firmware-stable-release.yml',
  'app-build.yml',
  'firmware-build.yml',
  'app-staging-build.yml'
]) {
  assert.ok(fs.existsSync('.github/workflows/' + f), 'missing ' + f);
}

const appBeta = read('.github/workflows/app-beta-release.yml');
const appStable = read('.github/workflows/app-stable-release.yml');
const fwBeta = read('.github/workflows/firmware-beta-release.yml');
const fwStable = read('.github/workflows/firmware-stable-release.yml');
const appBuild = read('.github/workflows/app-build.yml');
const fwBuild = read('.github/workflows/firmware-build.yml');

for (const t of [appBeta, appStable]) {
  assert.doesNotMatch(t, /gh workflow run firmware-beta-release\.yml/);
  assert.doesNotMatch(t, /Dispatch and wait for dedicated firmware prerelease/);
}

/* P0: application release branch/version identity comes from release metadata, not duplicated constants. */
assert.match(appBeta, /applicationRelease\.branch/);
assert.match(appBeta, /applicationRelease\.channel/);
assert.match(appBeta, /CANONICAL_BRANCH/);
assert.doesNotMatch(appBeta, /EXPECTED_BRANCH:/);
assert.doesNotMatch(appBeta, /EXPECTED_VERSION:/);
assert.match(appBeta, /prerelease: true/);
assert.match(appBeta, /make_latest: false/);

assert.match(appStable, /GITHUB_REF_NAME/);
assert.match(appStable, /updater-stable/);
assert.match(appStable, /EXPECTED_BRANCH: main|applicationRelease.*branch.*main|branch.*main/s);
assert.match(appStable, /prerelease: false/);
assert.match(appStable, /make_latest: true/);
assert.doesNotMatch(appStable, /tauri-desktop\.yml/);

assert.match(fwBeta, /uses: \.\/\.github\/workflows\/firmware-build\.yml/);
assert.match(appBuild, /workflow_call:/);
assert.ok(!fs.existsSync('.github/workflows/beta-release.yml'));
assert.ok(!fs.existsSync('.github/workflows/tauri-desktop.yml'));
assert.ok(!fs.existsSync('.github/workflows/tauri-artifact-build.yml'));
assert.ok(fs.existsSync('.github/workflows/app-staging-build.yml'));

/* Firmware build is CI/build-only. Publishing belongs to dedicated release workflows. */
assert.match(fwBuild, /workflow_call:/);
assert.match(fwBuild, /permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(fwBuild, /softprops\/action-gh-release/);
assert.doesNotMatch(fwBuild, /tag_name:\s*firmware-latest/);

/* Stable firmware workflow is a real explicit-promotion path. */
assert.match(fwStable, /GITHUB_REF_NAME.*main|test "\$\{GITHUB_REF_NAME\}" = "main"/s);
assert.match(fwStable, /Arduino_LED_Controller_Firmware_STABLE/);
assert.match(fwStable, /uses: \.\/\.github\/workflows\/firmware-build\.yml/);
assert.match(fwStable, /firmwareRelease\.recommendedVersion/);
assert.match(fwStable, /firmwareRelease\?\.channel!=='stable'|firmwareRelease.*channel.*stable/s);
assert.match(fwStable, /firmwareRelease\?\.available!==true|available.*true/s);
assert.match(fwStable, /isPrerelease/);
assert.match(fwStable, /= "false"/);
assert.match(fwStable, /firmware-catalog\.json/);
assert.match(fwStable, /"channel":"stable"/);

if (r.applicationRelease.channel === 'beta') {
  assert.equal(r.applicationRelease.branch, __v774AppBeta ? 'next/v5-rearchitecture' : 'main');
  assert.equal(r.firmwareRelease.channel, __v774FirmwareBeta ? 'beta' : 'stable');
} else {
  assert.equal(r.applicationRelease.channel, 'stable');
  assert.equal(r.applicationRelease.branch, 'main');
  assert.equal(r.firmwareRelease.channel, 'stable');
  assert.equal(r.firmwareRelease.available, true);
  assert.match(r.firmwareRelease.recommendedVersion, /^\d+\.\d+\.\d+$/);
  assert.doesNotMatch(r.firmwareRelease.recommendedVersion, /-(alpha|beta|rc)/);
}

console.log('CANONICAL_WORKFLOW_SET=PASSED');
console.log('APP_FIRMWARE_RELEASE_DISPATCH_COUPLING=REMOVED');
console.log('P0_RELEASE_BRANCH_SSOT=PASSED');
console.log('FIRMWARE_BUILD_CI_ONLY=PASSED');
console.log('STABLE_FIRMWARE_EXPLICIT_PROMOTION_PATH=PASSED');
console.log('RELEASE_WORKFLOW_ARCHITECTURE_FOUNDATION=PASSED');
