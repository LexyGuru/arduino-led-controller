#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const app = read('desktop-tauri/src/App.tsx');
const sidebar = read('desktop-tauri/src/components/Sidebar.tsx');
const topbar = read('desktop-tauri/src/components/Topbar.tsx');
const dashboard = read('desktop-tauri/src/pages/DashboardPage.tsx');
const css = read('desktop-tauri/src/core-ui-v3.css');
const themeTypes = read('desktop-tauri/src/design-system/theme-types.ts');
const release = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));

assert.equal(release.application, '5.7.0-beta.4');
assert.equal(release.channel, 'beta');
assert.equal(release.firmware, '5.0.1-beta.1');
assert.equal(release.firmwareRelease.channel, 'beta');

assert.match(themeTypes, /THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(themeTypes, /CORE_UI_VERSION = '3\.0'/);

assert.match(app, /core-ui-v3-shell/);
assert.match(app, /core-v3-content-shell/);
assert.match(sidebar, /core-v3-sidebar/);
assert.match(sidebar, />UI 3\.0</);
assert.match(sidebar, />5\.7 Beta\.1</);
assert.doesNotMatch(sidebar, />UI 2\.0</);
assert.doesNotMatch(sidebar, />Beta 5</);

assert.match(topbar, /core-v3-topbar/);
assert.match(topbar, /data-connection-state/);
assert.match(topbar, /aria-live="polite"/);

assert.match(dashboard, /core-v3-dashboard/);
assert.match(dashboard, /data-core-dashboard="3\.0"/);
assert.match(dashboard, /core-v3-command-deck/);
assert.match(dashboard, /core-v3-metric-row/);
assert.match(dashboard, /data-device-state/);

for (const token of [
  'V670 — Core UI 3.0 Shell + Dashboard command deck',
  '--core-v3-shell-gutter',
  '--core-v3-panel-depth',
  '.app-shell.core-ui-v3.core-ui-v3-shell',
  '.core-v3-sidebar',
  '.core-v3-topbar',
  '.core-v3-command-deck',
  '.core-v3-metric-row',
  '.core-v3-dashboard .v55-primary-card',
  '@media (max-width: 820px)',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert.ok(css.includes(token), `Missing V670 Core UI token: ${token}`);
}

for (const themeToken of [
  'var(--ds-background)',
  'var(--ds-surface-raised)',
  'var(--ds-accent)',
  'var(--ds-border)',
  'var(--ds-text-secondary)'
]) {
  assert.ok(css.includes(themeToken), `Theme Engine token wiring missing: ${themeToken}`);
}

assert.equal(manifest.current.includes('test:core-ui-v3-shell-dashboard'), true);

console.log('V670_CORE_UI_30_SHELL=PASSED');
console.log('V670_CORE_UI_30_DASHBOARD_COMMAND_DECK=PASSED');
console.log('V670_THEME_ENGINE_TOKEN_WIRING=PASSED');
console.log('V670_RESPONSIVE_REDUCED_MOTION=PASSED');
