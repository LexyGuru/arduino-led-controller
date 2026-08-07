#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const workflow = fs.readFileSync('.github/workflows/firmware-beta-release.yml', 'utf8');
for (const marker of [
  'Preserve immutable published firmware assets',
  'IMMUTABLE_EXISTING_ASSET_PRESERVED',
  'REBUILD_DRIFT_DETECTED',
  'candidate_sha',
  'published_sha',
  'expected_published_sha',
  'gh release download "${FIRMWARE_RELEASE_TAG}" --pattern "${name}"',
  'gh release download "${FIRMWARE_RELEASE_TAG}" --pattern "${sha_name}"',
  'gh release upload "${FIRMWARE_RELEASE_TAG}" "${file}" "${sha_file}"'
]) assert.ok(workflow.includes(marker), `missing marker: ${marker}`);
assert.ok(!workflow.includes('Azonos firmware assetnév eltérő tartalommal: ${name}'));
console.log('FIRMWARE_EXISTING_VERSION_IMMUTABLE=PASSED');
console.log('FIRMWARE_PUBLISHED_SHA_PAIR_VALIDATION=PASSED');
console.log('FIRMWARE_REBUILD_DRIFT_NON_DESTRUCTIVE=PASSED');
console.log('FIRMWARE_NEW_VERSION_UPLOAD_PRESERVED=PASSED');
console.log('BETA8_FIRMWARE_IMMUTABILITY_FIX=PASSED');
