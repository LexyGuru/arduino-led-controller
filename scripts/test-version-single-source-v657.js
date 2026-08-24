#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const versions = JSON.parse(read('release-versions.json'));
const __v774AppBeta = /-beta\.\d+$/.test(versions.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(versions.firmware);
const versionFile = read('VERSION').trim();
const checker = read('scripts/check-versions.py');

assert.equal(versionFile, versions.application);
assert.equal(versions.applicationRelease.version, versions.application);
assert.equal(versions.applicationRelease.channel, versions.channel);

let appWorkflow;
let firmwareWorkflow;
if (versions.channel === 'beta') {
  assert.equal(versions.applicationRelease.branch, __v774AppBeta ? 'next/v5-rearchitecture' : 'main');
  appWorkflow = read('.github/workflows/app-beta-release.yml');
  firmwareWorkflow = read(
    versions.firmwareRelease.channel === 'beta'
      ? '.github/workflows/firmware-beta-release.yml'
      : '.github/workflows/firmware-stable-release.yml'
  );

  assert.doesNotMatch(appWorkflow, /EXPECTED_VERSION:/);
  assert.doesNotMatch(appWorkflow, /EXPECTED_BRANCH:/);
  assert.match(appWorkflow, /release-versions\.json'\)\.application/);
  assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
  assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.channel/);

  if (versions.firmwareRelease.channel === 'beta') {
    assert.doesNotMatch(firmwareWorkflow, /EXPECTED_BRANCH:/);
    assert.match(firmwareWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
    assert.match(firmwareWorkflow, /release-versions\.json'\)\.firmwareRelease\.channel/);
  } else {
    assert.equal(versions.firmwareRelease.channel, __v774FirmwareBeta ? 'beta' : 'stable');
    assert.match(firmwareWorkflow, /firmwareRelease\.recommendedVersion/);
    assert.match(firmwareWorkflow, /GITHUB_REF_NAME/);
  }
  console.log('BETA_APP_WORKFLOW_VERSION_SSOT=PASSED');
  console.log(`FIRMWARE_WORKFLOW_CHANNEL=${versions.firmwareRelease.channel}`);
} else {
  assert.equal(versions.channel, 'stable');
  assert.equal(versions.applicationRelease.branch, 'main');
  appWorkflow = read('.github/workflows/app-stable-release.yml');
  firmwareWorkflow = read('.github/workflows/firmware-stable-release.yml');

  assert.match(appWorkflow, /EXPECTED_BRANCH: main/);
  assert.match(appWorkflow, /release-versions\.json/);
  assert.match(appWorkflow, /applicationRelease\?\.channel!='stable'|applicationRelease\?\.channel!=='stable'/);
  assert.match(appWorkflow, /applicationRelease\?\.branch!='main'|applicationRelease\?\.branch!=='main'/);
  assert.match(appWorkflow, /applicationRelease\?\.updaterAlias!='updater-stable'|applicationRelease\?\.updaterAlias!=='updater-stable'/);

  assert.match(firmwareWorkflow, /test "\$\{GITHUB_REF_NAME\}" = "main"/);
  assert.match(firmwareWorkflow, /firmwareRelease\.recommendedVersion/);
  assert.match(firmwareWorkflow, /r\.channel!='stable'|r\.channel!=='stable'/);
  assert.match(firmwareWorkflow, /firmwareRelease\?\.channel!='stable'|firmwareRelease\?\.channel!=='stable'/);

  console.log('STABLE_WORKFLOW_VERSION_SSOT=PASSED');
}

assert.match(checker, /expected = release_data\.get\("application"\)/);
assert.match(checker, /"VERSION": version_file/);

cp.execFileSync('python3', ['scripts/check-versions.py'], { stdio: 'inherit' });
console.log(`VERSION_SINGLE_SOURCE=PASSED:${versions.application}`);
console.log('CANONICAL_VERSION_SOURCE=release-versions.json');
console.log(`CURRENT_RELEASE_CHANNEL=${versions.channel}`);
