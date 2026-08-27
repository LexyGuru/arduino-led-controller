#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const env = fs.readFileSync('deploy/staging.env.example', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
const beta = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);

assert.ok(beta, `Beta version parse failed: ${version}`);
const candidate = `beta.${beta[4]}-gate`;

assert.equal((env.match(/^RELEASE_TARGET_VERSION=.*$/gm) || []).length, 1);
assert.equal((env.match(/^RELEASE_CANDIDATE=.*$/gm) || []).length, 1);
assert.ok(env.includes(`RELEASE_TARGET_VERSION=${version}`));
assert.ok(env.includes(`RELEASE_CANDIDATE=${candidate}`));

const checker = fs.readFileSync('scripts/check-versions.py', 'utf8');
for (const marker of [
  'read_env_value',
  'expected_release_candidate',
  'staging_surfaces',
  'staging_mismatches',
  'Kanonikus staging RELEASE_TARGET_VERSION',
  'Kanonikus staging RELEASE_CANDIDATE',
  'application / firmware / Direct API / staging SSOT'
]) {
  assert.ok(checker.includes(marker), marker);
}

console.log(`V858G_STAGING_CANONICAL_TARGET=PASSED:${version}`);
console.log(`V858G_STAGING_CANONICAL_CANDIDATE=PASSED:${candidate}`);
console.log('V858G_STAGING_DUPLICATE_GUARD=PASSED');
console.log('V858G_STAGING_SSOT_GATE=PASSED');
