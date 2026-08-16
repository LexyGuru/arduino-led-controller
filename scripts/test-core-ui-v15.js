#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const app = read('desktop-tauri/src/App.tsx');
const sidebar = read('desktop-tauri/src/components/Sidebar.tsx');
const themeProvider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const topbar = read('desktop-tauri/src/components/Topbar.tsx');
const bottom = read('desktop-tauri/src/components/BottomNav.tsx');
const css = read('desktop-tauri/src/core-ui-v1.5.css');
const main = read('desktop-tauri/src/main.tsx');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');
const web = read('web-lxc/src/main.tsx');

assert.match(app, /<BottomNav/);
assert.match(app, /core-ui-v15/);
assert.match(app, /core-ui-v20/);
assert.match(app, /data-page=\{page\}/);

assert.match(sidebar, /core-sidebar/);
assert.match(sidebar, /aria-current/);
assert.doesNotMatch(sidebar, /macos_sync_app_icon/);
assert.match(themeProvider, /macos_sync_app_icon/);
assert.match(themeProvider, /theme:\s*resolvedMode/);
assert.match(sidebar, /V5BetaBadge/);
for (const id of ['dashboard','leds','schedules','firmware','logs','settings']) {
  assert.match(sidebar, new RegExp(`id:'${id}'`), `legacy compact nav id compatibility: ${id}`);
}

assert.match(topbar, /Core UI 2\.0/);
assert.match(topbar, /Arduino LED Controller V5/);
assert.match(topbar, /Direct Arduino Control & Automation/);
assert.match(topbar, /core-connection-chip/);
assert.match(topbar, /className=\"status-line\"/);

assert.match(bottom, /bottom-nav/);
assert.match(bottom, /mobile-more-sheet/);
assert.match(bottom, /aria-expanded/);
assert.match(bottom, /firmware/);
assert.match(bottom, /logs/);
assert.match(bottom, /settings/);

assert.match(css, /--core-sidebar-width/);
assert.match(css, /@media \(max-width: 820px\)/);
assert.match(css, /@media \(max-width: 430px\)/);
assert.match(css, /env\(safe-area-inset-bottom/);
assert.match(css, /min-width: 0 !important/);
assert.match(css, /\.bottom-nav/);
assert.match(css, /\.mobile-more-panel/);
assert.match(css, /focus-visible/);
assert.match(css, /prefers-reduced-motion/);

assert.match(main, /import '.\/core-ui-v1\.5\.css'/);
assert.match(web, /desktop-tauri\/src\/main/);

for (const key of [
  'core.navigation',
  'core.primaryNavigation',
  'core.mobileNavigation',
  'core.more',
  'core.close',
  'core.controlCenter'
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (i18n.match(new RegExp(`['"]${escaped}['"]`, 'g')) || []).length;
  assert.equal(count, 3, `${key}: HU/EN/DE parity`);
}

console.log(
  'OK: Core UI 2.0 current identity with Core UI 1.5 compatibility assets, responsive shell and LXC shared contract'
);
