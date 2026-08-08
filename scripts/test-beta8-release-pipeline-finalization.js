#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

const versions = readJson('release-versions.json');
const workflow = read('.github/workflows/beta-release.yml');
const installer = read('deploy/install-beta-lxc.sh');
const staging = read('deploy/install-staging-service.sh');
const stagingEnv = read('deploy/staging.env.example');
const unit = read('deploy/systemd/arduino-led-controller-staging.service');
const bundle = read('deploy/build-beta-release-bundle.sh');
const workflowTest = read('scripts/test-beta-release-workflow.js');
const assetsTest = read('scripts/test-beta-installation-assets.js');
const guide = read('docs/v5/BETA8_INSTALLATION_GUIDE.md');
const notes = read('docs/v5/BETA8_RELEASE_NOTES.md');
const checklist = read('docs/v5/BETA8_RELEASE_CHECKLIST.md');

assert.equal(versions.application, '5.0.0-beta.9');
assert.equal(versions.firmware, '5.0.0-beta.6');
assert.equal(versions.directApi, '1.0.0');

for (const name of [
  'BETA8_INSTALLATION_GUIDE.md',
  'BETA8_RELEASE_NOTES.md',
  'BETA8_RELEASE_CHECKLIST.md'
]) {
  assert.ok(workflow.includes(`docs/v5/${name}`), `workflow missing ${name}`);
}

assert.ok(!workflow.includes('cp docs/v5/BETA7_'), 'workflow still copies Beta.7 docs');
assert.ok(workflow.includes('EXPECTED_VERSION: 5.0.0-beta.9'));
assert.ok(workflow.includes('body_path: docs/v5/BETA8_RELEASE_NOTES.md'));
assert.ok(workflow.includes('gh workflow run firmware-beta-release.yml'));

assert.ok(installer.includes('VERSION="${BETA_VERSION:-5.0.0-beta.9}"'));
assert.ok(staging.includes('RELEASE_CHANNEL beta'));
assert.ok(stagingEnv.includes('RELEASE_TARGET_VERSION=5.0.0-beta.9'));
assert.ok(stagingEnv.includes('RELEASE_CANDIDATE=beta.8-gate'));
assert.ok(unit.includes('Description=Arduino LED Controller 5.0.0-beta.9 Staging'));
assert.ok(bundle.includes("candidate: 'beta.8-gate'"));

assert.ok(workflowTest.includes('BETA8_RELEASE_NOTES'));
assert.ok(assetsTest.includes("5.0.0-beta.9"));
assert.ok(assetsTest.includes("5.0.0-beta.6"));
assert.ok(assetsTest.includes("BETA8_INSTALLATION_GUIDE.md"));
assert.ok(assetsTest.includes("BETA8_RELEASE_NOTES.md"));
assert.ok(assetsTest.includes("BETA8_RELEASE_CHECKLIST.md"));

for (const token of [
  'Windows x86_64', 'macOS Apple Silicon', 'macOS Intel', 'Linux x86_64',
  'Android', 'iPhone és iPad', 'Debian 12 / Proxmox LXC',
  'Arduino UNO R4 WiFi firmware', 'SHA256SUMS', 'SBOM.cdx.json',
  'PROVENANCE.json', 'SECRET-SCAN.json'
]) {
  assert.ok(guide.includes(token), `guide missing ${token}`);
}

assert.ok(notes.includes('5.0.0-beta.9'));
assert.ok(notes.includes('prerelease'));
assert.ok(notes.includes('SBOM'));
assert.ok(notes.includes('main'));

for (const token of [
  'Windows x86_64', 'macOS Apple Silicon', 'macOS Intel', 'Linux x86_64',
  'Android', 'iPhone és iPad', 'LXC / Debian szerver',
  'Arduino UNO R4 WiFi firmware', 'Teljes alkalmazási staging'
]) {
  assert.ok(checklist.includes(token), `checklist missing ${token}`);
}

console.log('CONTRACT_ROOT_RESOLUTION=PASSED');
console.log('BETA8_RELEASE_DOC_ASSETS=PASSED');
console.log('BETA8_RELEASE_WORKFLOW_ASSETS=PASSED');
console.log('BETA8_LXC_DEFAULT_VERSION=PASSED');
console.log('BETA8_STAGING_RELEASE_TARGET=PASSED');
console.log('BETA8_RELEASE_PIPELINE_FINALIZATION=PASSED');
