#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
for (const path of ['.github/workflows/app-beta-release.yml','.github/workflows/app-stable-release.yml']) {
  const text = read(path);
  const start = text.indexOf('- name: Verify expected release asset classes');
  assert.ok(start >= 0, `${path}: verify step missing`);
  const end = text.indexOf('- name: Generate Tauri updater static feed', start);
  const block = text.slice(start, end);
  assert.match(block, /VERIFIED_VERSION:\s*\$\{\{\s*needs\.validate\.outputs\.version\s*\}\}/);
  assert.match(block, /process\.env\.VERIFIED_VERSION/);
  assert.match(block, /require_count\(\)/);
  assert.match(block, /RELEASE_ASSET_CLASS=/);
  assert.match(block, /Release asset class mismatch:/);
  assert.match(block, /RELEASE_ASSET_VERSION=\$\{VERIFIED_VERSION\}/);
  assert.doesNotMatch(block, /EXPECTED_VERSION:/);
}
console.log('P1_RELEASE_ASSET_VERIFIED_VERSION_WIRING=PASSED');
console.log('P1_RELEASE_ASSET_DIAGNOSTICS=PASSED');
console.log('P1_BETA_STABLE_ASSET_CONTRACT_PARITY=PASSED');
