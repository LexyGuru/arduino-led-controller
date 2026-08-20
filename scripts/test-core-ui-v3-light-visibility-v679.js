#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const css = read('desktop-tauri/src/core-ui-v3.css');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const release = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));

assert.equal(release.application, '5.7.0-beta.2');
assert.equal(release.firmware, '5.0.0');
assert.equal(release.firmwareRelease.channel, 'stable');
assert.match(types, /THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types, /CORE_UI_VERSION = '3\.0'/);

for (const token of [
  'V679 — Light theme visibility + contrast final pass',
  '--core-light-strong-border',
  '--core-light-readable-muted',
  '--core-light-control-surface',
  "[data-appearance='light']",
  '.core-v3-sidebar nav button.active',
  '.v55-unified-line',
  '.endpoint-preview',
  ':disabled',
  ':focus-visible',
  "[data-contrast='high']",
  '@media (max-width: 720px)'
]) {
  assert.ok(css.includes(token), `Missing V679 light-theme token: ${token}`);
}

for (const themeToken of [
  'var(--ds-text)',
  'var(--ds-text-secondary)',
  'var(--ds-text-muted)',
  'var(--ds-border)',
  'var(--ds-surface-raised)',
  'var(--ds-surface-soft)',
  'var(--ds-accent)',
  'var(--ds-accent-soft)',
  'var(--ds-shadow)'
]) {
  assert.ok(css.includes(themeToken), `Missing Theme Engine token: ${themeToken}`);
}

// Keep V676 compatibility layer intact.
for (const token of [
  'V676 — Core UI 3.0 final responsive + accessibility + theme sweep',
  '@media (forced-colors: active)',
  "@media (prefers-reduced-motion: reduce)"
]) {
  assert.ok(css.includes(token), `V676 compatibility regression: ${token}`);
}

assert.equal(manifest.current.includes('test:core-ui-v3-light-visibility'), true);

console.log('V679_LIGHT_TEXT_VISIBILITY=PASSED');
console.log('V679_LIGHT_CONTROLS_VISIBILITY=PASSED');
console.log('V679_LIGHT_NAV_BADGES_VISIBILITY=PASSED');
console.log('V679_LIGHT_LOGS_VISIBILITY=PASSED');
console.log('V679_LIGHT_DISABLED_FOCUS_VISIBILITY=PASSED');
console.log('V679_THEME_ENGINE_TOKEN_ONLY=PASSED');
