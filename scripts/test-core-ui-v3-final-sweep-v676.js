#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p,'utf8');

const css = read('desktop-tauri/src/core-ui-v3.css');
const provider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const sidebar = read('desktop-tauri/src/components/Sidebar.tsx');
const release = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));

assert.equal(release.application,'5.7.0-beta.5');
assert.equal(release.firmware, '5.0.1-beta.1');
assert.equal(release.firmwareRelease.channel, 'beta');
assert.match(types,/THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types,/CORE_UI_VERSION = '3\.0'/);

for (const token of [
  'dataset.coreUi',
  'dataset.appearance',
  'dataset.density',
  'dataset.animations',
  'dataset.glass',
  'dataset.motion',
  'dataset.glow',
  'dataset.backgroundArt',
  'dataset.contrast',
  'dataset.visualFx'
]) assert.ok(provider.includes(token),`Theme runtime dataset missing: ${token}`);

assert.match(sidebar,/aria-current=\{page === id \? 'page' : undefined\}/);
assert.match(sidebar,/<nav aria-label=/);

for (const token of [
  'V676 — Core UI 3.0 final responsive + accessibility + theme sweep',
  ':focus-visible',
  '--core-a11y-target-min',
  "[data-appearance='light']",
  "[data-glass='off']",
  "[data-background-art='off']",
  "[data-glow='off']",
  "[data-density='compact']",
  "[data-density='comfortable']",
  "[data-animations='off']",
  "[data-motion='off']",
  "[data-contrast='high']",
  '@media (forced-colors: active)',
  '@media (max-width: 480px)',
  '@media (prefers-reduced-motion: reduce)',
  'overflow-wrap: anywhere',
  'env(safe-area-inset-bottom)'
]) assert.ok(css.includes(token),`Missing V676 compatibility token: ${token}`);

for (const themeToken of [
  'var(--ds-accent)',
  'var(--ds-surface-raised)',
  'var(--ds-border)',
  'var(--ds-text)',
  'var(--ds-shadow)'
]) assert.ok(css.includes(themeToken),`Theme token missing: ${themeToken}`);

assert.equal(manifest.current.includes('test:core-ui-v3-final-sweep'),true);

console.log('V676_KEYBOARD_FOCUS_ACCESSIBILITY=PASSED');
console.log('V676_RESPONSIVE_OVERFLOW_SAFE_AREA=PASSED');
console.log('V676_LIGHT_GLASS_GLOW_DENSITY_COMPAT=PASSED');
console.log('V676_HIGH_CONTRAST_FORCED_COLORS=PASSED');
console.log('V676_MOTION_PREFERENCES=PASSED');
console.log('V676_THEME_RUNTIME_DATASET_COMPAT=PASSED');
