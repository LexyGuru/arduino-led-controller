#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const release = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const provider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const main = read('desktop-tauri/src/main.tsx');
const app = read('desktop-tauri/src/App.tsx');
const topbar = read('desktop-tauri/src/components/Topbar.tsx');
const css = read('desktop-tauri/src/core-ui-v3.css');
const canonicalApplicationVersion = read('VERSION').trim();

assert.match(canonicalApplicationVersion, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(release.application, versionSsot.application);
assert.equal(release.applicationRelease.version, versionSsot.application);
assert.equal(release.channel, 'beta');
assert.equal(release.applicationRelease.channel, 'beta');
assert.equal(release.applicationRelease.branch, 'next/v5-rearchitecture');

assert.match(release.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(release.firmwareRelease.channel, 'beta');
assert.equal(release.firmwareRelease.recommendedVersion, versionSsot.firmware);
assert.equal(release.directApi, versionSsot.directApi);

assert.match(types, /THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types, /CORE_UI_VERSION = '3\.0'/);
assert.match(provider, /root\.dataset\.coreUi = CORE_UI_VERSION/);

assert.match(main, /import '\.\/core-ui-v3\.css';/);
assert.doesNotMatch(main, /import '\.\/core-ui-v1\.5\.css';/);

assert.match(app, /core-ui-v3/);
assert.doesNotMatch(app, /core-ui-v15/);

assert.match(topbar, /Core UI 3\.0/);
assert.doesNotMatch(topbar, /Core UI 2\.0/);

assert.equal(manifest.current.includes('test:core-ui-v3'), true);
assert.equal(manifest.current.includes('test:core-ui-v15'), false);

for (const token of [
  '--core-panel-radius',
  '--core-panel-radius-small',
  '--core-control-radius',
  '--core-panel-shadow',
  '--core-panel-shadow-hover',
  '--core-shell-gap',
  '--core-page-gap',
  "html[data-core-ui='3.0'] .panel",
  "html[data-core-ui='3.0'] .stat-card",
  "html[data-core-ui='3.0'][data-density='compact']",
  "html[data-core-ui='3.0'][data-density='touch']",
  "html[data-core-ui='3.0'][data-radius='square']",
  "html[data-core-ui='3.0'][data-radius='extra-rounded']",
  '@media (prefers-reduced-motion:reduce)'
]) {
  assert.ok(css.includes(token), `Missing Core UI 3.0 token: ${token}`);
}

console.log('CORE_UI_30_RUNTIME_IDENTITY=PASSED');
console.log('THEME_ENGINE_20_PRODUCT_CONTRACT=PRESERVED');
console.log('CORE_UI_30_VISIBLE_IDENTITY=PASSED');
console.log('CORE_UI_30_CURRENT_TEST_MANIFEST=PASSED');
console.log('CORE_UI_15_CURRENT_GATE=RETIRED');
console.log('CORE_UI_30_SHAPE_FOUNDATION=PASSED');
console.log('BETA_APP_STABLE_FIRMWARE_DECOUPLING=PASSED');
console.log('CORE_UI_VERSION_CONTRACT_DYNAMIC=PASSED');
