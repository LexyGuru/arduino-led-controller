#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const CURRENT_APPLICATION_VERSION = fs.readFileSync('VERSION','utf8').trim();
const manifest = JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const applicationChannel =
  manifest.applicationRelease?.channel ||
  manifest.channel ||
  'unknown';
const currentFirmware =
  manifest.firmwareRelease?.recommendedVersion ||
  manifest.firmware ||
  null;

const workflow = fs.readFileSync('.github/workflows/beta-release.yml','utf8');
const readme = fs.readFileSync('README.md','utf8');
const deploy = fs.readFileSync('deploy/README.md','utf8');
const notes = fs.readFileSync('docs/v5/BETA9_RELEASE_NOTES.md','utf8');
const guide = fs.readFileSync('docs/v5/BETA9_INSTALLATION_GUIDE.md','utf8');
const checklist = fs.readFileSync('docs/v5/BETA9_RELEASE_CHECKLIST.md','utf8');

const escapeRegExp=(value)=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

if (applicationChannel === 'beta') {
  assert.match(
    workflow,
    new RegExp(`EXPECTED_VERSION:\\s*${escapeRegExp(CURRENT_APPLICATION_VERSION)}`)
  );
  console.log(`BETA9_RELEASE_WORKFLOW_CURRENT_BETA_VERSION=PASSED:${CURRENT_APPLICATION_VERSION}`);
} else if (applicationChannel === 'stable') {
  assert.match(workflow,/EXPECTED_BRANCH:\s*next\/v5-rearchitecture/);
  assert.match(workflow,/EXPECTED_VERSION:\s*\d+\.\d+\.\d+-beta\.\d+/);
  assert.doesNotMatch(workflow,new RegExp(`EXPECTED_VERSION:\\s*${escapeRegExp(CURRENT_APPLICATION_VERSION)}`));
  console.log('BETA9_RELEASE_WORKFLOW_PRESERVED_AS_BETA_HISTORY=PASSED');
} else {
  assert.fail(`Unsupported application channel: ${applicationChannel}`);
}

assert.match(workflow,/prerelease: true/);
assert.match(workflow,/make_latest: false/);

assert.ok(
  readme.includes(CURRENT_APPLICATION_VERSION),
  'README: current application version missing'
);

if (applicationChannel === 'beta' && currentFirmware) {
  assert.ok(
    readme.includes(currentFirmware),
    'README: current firmware version missing'
  );
}

// Beta.9 release documents are immutable historical release evidence.
for (const text of [notes,guide,checklist]) {
  assert.match(text,/5.0.0-beta.9/);
  assert.match(text,/5.0.0-beta.6/);
}
assert.match(deploy,/arduino-led-controller-rust\.service/);
assert.match(deploy,/Legacy Node/);
assert.match(deploy,/BEGIN BETA9 CANONICAL RUST LXC/);
assert.match(deploy,/arduino-led-controller\.service/);
assert.match(notes,/shared React/i);
assert.match(notes,/v5-icon\.png/);
assert.match(notes,/tranzakciós/i);
assert.match(guide,/Proxmox|LXC/);
assert.match(checklist,/npm test/);
assert.match(checklist,/test:rust-lxc/);

for (const [name,text] of [
  ['notes',notes],
  ['guide',guide],
  ['checklist',checklist],
]) {
  assert.match(text,/5\.0\.0-beta\.9/i,`${name}: canonical app Beta.9 missing`);
  assert.match(text,/5\.0\.0-beta\.6/i,`${name}: paired firmware Beta.6 missing`);
  for (const line of text.split(/\r?\n/)) {
    if (/firmware/i.test(line) && /5\.0\.0-beta\.9/i.test(line) && !/5\.0\.0-beta\.6/i.test(line)) {
      assert.fail(`${name}: firmware line incorrectly advertises app Beta.9: ${line}`);
    }
  }
}

console.log('BETA9_RELEASE_WORKFLOW_CHANNEL_AWARE=PASSED');
console.log('BETA9_RELEASE_DOCUMENTATION=PASSED');
console.log('BETA9_RUST_LEGACY_DEPLOY_SEPARATION=PASSED');
console.log('BETA9_DOCUMENTATION_RELEASE_READINESS=PASSED');
