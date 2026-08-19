#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const versions = JSON.parse(read('release-versions.json'));
const versionFile = read('VERSION').trim();
const appWorkflow = read('.github/workflows/app-beta-release.yml');
const firmwareWorkflow = read('.github/workflows/firmware-beta-release.yml');
const checker = read('scripts/check-versions.py');

assert.equal(versionFile, versions.application);
assert.equal(versions.applicationRelease.version, versions.application);
assert.equal(versions.applicationRelease.channel, versions.channel);
assert.equal(versions.channel, 'beta');
assert.equal(versions.applicationRelease.branch, 'next/v5-rearchitecture');

assert.doesNotMatch(appWorkflow, /EXPECTED_VERSION:/);
assert.doesNotMatch(appWorkflow, /EXPECTED_BRANCH:/);
assert.match(appWorkflow, /release-versions\.json'\)\.application/);
assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
assert.match(appWorkflow, /release-versions\.json'\)\.applicationRelease\.channel/);

assert.doesNotMatch(firmwareWorkflow, /EXPECTED_BRANCH:/);
assert.match(firmwareWorkflow, /release-versions\.json'\)\.applicationRelease\.branch/);
assert.match(firmwareWorkflow, /release-versions\.json'\)\.firmwareRelease\.channel/);

assert.match(checker, /expected = release_data\.get\("application"\)/);
assert.match(checker, /"VERSION": version_file/);

cp.execFileSync('python3', ['scripts/check-versions.py'], { stdio: 'inherit' });
console.log(`VERSION_SINGLE_SOURCE=PASSED:${versions.application}`);
console.log('CANONICAL_VERSION_SOURCE=release-versions.json');
console.log('BETA_WORKFLOW_HARDCODED_VERSION=REMOVED');
console.log('BETA_WORKFLOW_HARDCODED_BRANCH=REMOVED');
