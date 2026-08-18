#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const oldPath='desktop-tauri/src/i18n/index.tsx';
const runtimePath='desktop-tauri/src/i18n/runtime.ts';

for(const obsolete of [
  'scripts/test-beta3-redesign-structural-recovery.js',
  'scripts/test-beta3-redesign-i18n-occurrence-recovery.js',
]){
  assert.equal(fs.existsSync(obsolete),false,`obsolete recovery layer exists: ${obsolete}`);
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
for(const obsolete of [
  'test:beta3-redesign-structural-recovery',
  'test:beta3-redesign-i18n-occurrence-recovery',
]){
  assert.equal(pkg.scripts[obsolete],undefined,`obsolete package script exists: ${obsolete}`);
  assert.ok(!pkg.scripts.test.includes(`npm run ${obsolete}`),`obsolete npm test token exists: ${obsolete}`);
}

const foundation=fs.readFileSync('scripts/test-beta3-redesign-foundation.mjs','utf8');
assert.ok(foundation.includes(oldPath));
assert.ok(foundation.includes(runtimePath));
assert.ok(foundation.includes("i18n.includes('I18nProvider')"));

for(const name of [
  'scripts/test-beta2-contract.js',
  'scripts/test-beta7-theme-audit-console.js',
]){
  const text=fs.readFileSync(name,'utf8');
  assert.ok(text.includes(runtimePath),`${name} must use runtime dictionary source`);
}

console.log('BETA3_REDESIGN_LEGACY_RECOVERY_LAYERS=ABSENT');
console.log('BETA3_REDESIGN_PACKAGE_PIPELINE=CANONICAL_ONLY');
console.log('BETA3_REDESIGN_BETA2_PARITY_RUNTIME_SOURCE=PASSED');
console.log('BETA3_REDESIGN_BETA7_PARITY_RUNTIME_SOURCE=PASSED');
console.log('BETA3_REDESIGN_REACT_BOUNDARY_PRESERVED=PASSED');
console.log('BETA3_REDESIGN_I18N_CANONICAL_PIPELINE=PASSED');
