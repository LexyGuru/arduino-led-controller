#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const versions = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));
const pkg = JSON.parse(read('package.json'));
const runner = read('scripts/run-test-suite-v2.js');
const architecture = read('scripts/test-test-architecture-v2.js');
const deviceGate = read('scripts/test-alpha3-device-key-header.js');

assert.equal(versions.application, '5.6.1-beta.2');
assert.equal(versions.firmware, '5.0.0-beta.10');
assert.equal(versions.directApi, '1.0.0');
assert.equal(versions.channel, 'beta');

for (const alias of [
  'test:firmware-device-key-channel-aware',
  'test:version-single-source',
  'test:architecture-consolidation',
]) {
  assert.ok(pkg.scripts[alias], `Missing canonical P0 test alias: ${alias}`);
  assert.ok(manifest.current.includes(alias), `P0 alias not current: ${alias}`);
}

assert.match(runner, /const betaMatch = currentVersion\.match/);
assert.match(runner, /const stableMatch = currentVersion\.match/);
assert.match(runner, /TEST_SUITE_RUNTIME_IDENTITY=/);
assert.match(architecture, /CURRENT_VERSION_CONTRACTS_CHANNEL_AWARE=PASSED/);
assert.match(deviceGate, /firmwareChannel === 'stable' \|\| firmwareChannel === 'beta'/);

console.log('P0_STABLE_FIX_FORWARD_SYNC=PASSED');
console.log('P0_VERSION_SINGLE_SOURCE=PASSED');
console.log('P0_TEST_ARCHITECTURE_CONSOLIDATION=PASSED');
console.log('P0_BETA_IDENTITY_PRESERVED=PASSED');
