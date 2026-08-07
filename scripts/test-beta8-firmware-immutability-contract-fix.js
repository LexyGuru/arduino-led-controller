#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const test = fs.readFileSync('scripts/test-firmware-beta-release.js', 'utf8');
const fw = fs.readFileSync('.github/workflows/firmware-beta-release.yml', 'utf8');

assert.ok(!test.includes('Azonos firmware assetnév eltérő tartalommal'));
for (const marker of [
  'Preserve immutable published firmware assets',
  'IMMUTABLE_EXISTING_ASSET_PRESERVED',
  'REBUILD_DRIFT_DETECTED',
  'published_sha',
  'expected_published_sha'
]) {
  assert.ok(test.includes(marker), `legacy firmware contract missing new marker: ${marker}`);
  assert.ok(fw.includes(marker), `workflow missing immutable marker: ${marker}`);
}

console.log('LEGACY_COLLISION_CONTRACT=REMOVED');
console.log('IMMUTABLE_FIRMWARE_CONTRACT=MIGRATED');
console.log('REBUILD_DRIFT_CONTRACT=PRESERVED');
console.log('BETA8_FIRMWARE_IMMUTABILITY_CONTRACT_FIX=PASSED');
