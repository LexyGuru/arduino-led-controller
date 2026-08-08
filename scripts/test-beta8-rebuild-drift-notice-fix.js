#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/firmware-beta-release.yml', 'utf8');
const fwTest = fs.readFileSync('scripts/test-firmware-beta-release.js', 'utf8');
const immutabilityTest = fs.readFileSync('scripts/test-beta8-firmware-immutability-fix.js', 'utf8');

assert.ok(workflow.includes('::notice::REBUILD_DRIFT_DETECTED'));
assert.ok(!workflow.includes('::warning::REBUILD_DRIFT_DETECTED'));
assert.ok(workflow.includes('IMMUTABLE_EXISTING_ASSET_PRESERVED'));
assert.ok(workflow.includes('candidate_sha'));
assert.ok(workflow.includes('published_sha'));
assert.ok(fwTest.includes('REBUILD_DRIFT_DETECTED'));
assert.ok(immutabilityTest.includes('REBUILD_DRIFT_DETECTED'));

console.log('REBUILD_DRIFT_VISIBILITY=NOTICE');
console.log('REBUILD_DRIFT_WARNING_ANNOTATION=REMOVED');
console.log('FIRMWARE_IMMUTABILITY=PRESERVED');
console.log('BETA8_REBUILD_DRIFT_NOTICE_FIX=PASSED');
