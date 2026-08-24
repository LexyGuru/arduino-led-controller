#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const leds = read('desktop-tauri/src/pages/LedsPage.tsx');
const bulk = read('desktop-tauri/src/components/v5/V5LedBulkActions.tsx');
const css = read('desktop-tauri/src/core-ui-v3.css');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const release = JSON.parse(read('release-versions.json'));
const __v774AppBeta = /-beta\.\d+$/.test(release.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(release.firmware);
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));

assert.equal(release.application, release.applicationRelease.version);
assert.equal(release.firmwareRelease.recommendedVersion, release.firmware);
assert.equal(release.firmwareRelease.channel, __v774FirmwareBeta ? 'beta' : 'stable');
assert.match(types, /THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types, /CORE_UI_VERSION = '3\.0'/);

for (const token of [
  'core-v3-leds-page',
  'data-core-controls="3.0"',
  'core-v3-led-card',
  'core-v3-led-preview',
  'core-v3-power-control',
  'core-control-field',
  'core-control-label',
  'core-range-input',
  'core-number-input',
  'core-select-input',
  'core-color-input',
  'core-value-pill',
  'core-v3-command-panel',
  'core-v3-command-chip'
]) {
  assert.ok(leds.includes(token), `Missing LED UI primitive: ${token}`);
}

assert.match(bulk, /core-v3-led-command-bar/);
assert.match(bulk, /core-v3-command-button/);
assert.match(bulk, /role="toolbar"/);

for (const token of [
  'V672 — Core UI 3.0 LED controls + reusable control primitives',
  '--core-control-height',
  '--core-control-track-height',
  '--core-control-thumb-size',
  '.core-control-field',
  '.core-range-input',
  '.core-number-input',
  '.core-select-input',
  '.core-color-input',
  '.core-v3-led-card.is-enabled',
  '.core-v3-led-command-bar',
  '@media (max-width: 620px)',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert.ok(css.includes(token), `Missing V672 CSS primitive: ${token}`);
}

for (const themeToken of [
  'var(--ds-accent)',
  'var(--ds-surface-soft)',
  'var(--ds-border)',
  'var(--ds-text-secondary)',
  'var(--ds-success)'
]) {
  assert.ok(css.includes(themeToken), `Missing Theme Engine token: ${themeToken}`);
}

// Preserve existing functional behavior.
assert.match(leds, /const SEND_DELAY_MS =\s*4000/);
assert.match(leds, /window\.setTimeout/);
assert.match(leds, /brightness:\s*clamp/);
assert.match(leds, /speed:\s*clamp/);
assert.match(leds, /state\s*\.\s*applyScene/);
assert.match(leds, /state\s*\.\s*runPreset/);

assert.equal(manifest.current.includes('test:core-ui-v3-led-controls'), true);

console.log('V672_LED_CONTROL_WORKSPACE=PASSED');
console.log('V672_REUSABLE_CONTROL_PRIMITIVES=PASSED');
console.log('V672_LED_FUNCTIONAL_BEHAVIOR_PRESERVED=PASSED');
console.log('V672_THEME_ENGINE_TOKEN_WIRING=PASSED');
