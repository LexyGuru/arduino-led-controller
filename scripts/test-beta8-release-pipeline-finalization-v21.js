#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const versions = json('release-versions.json');
assert.equal(versions.application, '5.0.0-beta.8');
assert.equal(versions.firmware, '5.0.0-beta.6');
assert.equal(versions.directApi, '1.0.0');

const stagingEnv = read('deploy/staging.env.example');
assert.ok(stagingEnv.includes('RELEASE_CHANNEL=beta'));
assert.ok(stagingEnv.includes('RELEASE_CANDIDATE=beta.8-gate'));
assert.ok(stagingEnv.includes('RELEASE_TARGET_VERSION=5.0.0-beta.8'));

const stagingInstaller = read('deploy/install-staging-service.sh');
assert.ok(stagingInstaller.includes('upsert_env RELEASE_CHANNEL beta'));
assert.ok(stagingInstaller.includes('upsert_env RELEASE_CANDIDATE beta.8-gate'));
assert.ok(stagingInstaller.includes('upsert_env RELEASE_TARGET_VERSION 5.0.0-beta.8'));

const installer = read('deploy/install-beta-lxc.sh');
assert.ok(installer.includes('VERSION="${BETA_VERSION:-5.0.0-beta.8}"'));

const bundle = read('deploy/build-beta-release-bundle.sh');
assert.ok(bundle.includes("candidate: 'beta.8-gate'"));

const workflow = read('.github/workflows/beta-release.yml');
for (const marker of [
  'EXPECTED_VERSION: 5.0.0-beta.8',
  'cp docs/v5/BETA8_INSTALLATION_GUIDE.md release-assets/',
  'cp docs/v5/BETA8_RELEASE_NOTES.md release-assets/',
  'cp docs/v5/BETA8_RELEASE_CHECKLIST.md release-assets/',
  'body_path: docs/v5/BETA8_RELEASE_NOTES.md'
]) {
  assert.ok(workflow.includes(marker), `workflow missing: ${marker}`);
}
assert.ok(!workflow.includes('cp docs/v5/BETA7_'));

const workflowTest = read('scripts/test-beta-release-workflow.js');
assert.ok(workflowTest.includes('BETA8_RELEASE_NOTES'));
assert.ok(workflowTest.includes('BETA8_INSTALLATION_GUIDE'));
assert.ok(workflowTest.includes('BETA8_RELEASE_CHECKLIST'));

const assetsTest = read('scripts/test-beta-installation-assets.js');
assert.ok(assetsTest.includes("docs/v5/BETA8_INSTALLATION_GUIDE.md"));
assert.ok(assetsTest.includes("docs/v5/BETA8_RELEASE_NOTES.md"));
assert.ok(assetsTest.includes("docs/v5/BETA8_RELEASE_CHECKLIST.md"));

for (const file of [
  'docs/v5/BETA8_INSTALLATION_GUIDE.md',
  'docs/v5/BETA8_RELEASE_NOTES.md',
  'docs/v5/BETA8_RELEASE_CHECKLIST.md'
]) {
  assert.ok(fs.existsSync(path.join(ROOT, file)), `missing ${file}`);
}

console.log('BETA8_STAGING_ENV=PASSED');
console.log('BETA8_STAGING_INSTALLER=PASSED');
console.log('BETA8_LXC_INSTALLER=PASSED');
console.log('BETA8_LXC_BUNDLE_METADATA=PASSED');
console.log('BETA8_WORKFLOW_DOC_ASSETS=PASSED');
console.log('BETA8_RELEASE_CONTRACTS=PASSED');
console.log('BETA8_V21_SOURCE_ALIGNED_CONTRACT=PASSED');
