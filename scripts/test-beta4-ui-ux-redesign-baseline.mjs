#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');

const app=read('desktop-tauri/src/App.tsx');
const main=read('desktop-tauri/src/main.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const dashboard=read('desktop-tauri/src/pages/DashboardPage.tsx');
const leds=read('desktop-tauri/src/pages/LedsPage.tsx');
const schedules=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const logs=read('desktop-tauri/src/pages/LogsPage.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const css=read('desktop-tauri/src/v551-beta4-ui-baseline.css');

assert.match(app,/className="app-shell core-ui-v15 core-ui-v20 beta4-ui-baseline"/);
assert.match(main,/import '\.\/v551-beta4-ui-baseline\.css';/);

for(const token of [
  '--beta4-shell-max',
  '--beta4-shell-gap',
  '--beta4-panel-gap',
  '--beta4-panel-pad',
  '--beta4-sidebar-width',
  '--beta4-content-reading-max',
  '--beta4-grid-min'
]){
  assert.ok(css.includes(token),`missing Beta.4 token: ${token}`);
}

for(const marker of [
  "id:'dashboard'",
  "id:'leds'",
  "id:'schedules'",
  "id:'firmware'",
  "id:'logs'",
  "id:'settings'"
]){
  assert.ok(sidebar.includes(marker),`navigation marker missing: ${marker}`);
}

assert.ok(topbar.includes('core-topbar'));
assert.ok(topbar.includes('core-connection-chip'));
assert.ok(dashboard.includes('v55-dashboard-hero'));
assert.ok(dashboard.includes('v55-primary-metrics'));

for(const [name,text] of [
  ['LedsPage',leds],
  ['SchedulesPage',schedules],
  ['FirmwarePage',firmware],
  ['LogsPage',logs],
  ['SettingsPage',settings]
]){
  assert.ok(text.includes('className='),`${name}: no class contract found`);
}

for(const page of [
  "'dashboard'",
  "'leds'",
  "'schedules'",
  "'firmware'",
  "'logs'",
  "'settings'"
]){
  assert.ok(app.includes(page),`App page route missing: ${page}`);
}

assert.ok(app.includes('<Sidebar'));
assert.ok(app.includes('<Topbar'));
assert.ok(app.includes('<DashboardPage'));
assert.ok(app.includes('<LedsPage'));
assert.ok(app.includes('<SchedulesPage'));
assert.ok(app.includes('<FirmwarePage'));
assert.ok(app.includes('<LogsPage'));
assert.ok(app.includes('<SettingsPage'));

console.log('BETA4_UI_BASELINE_MODULE_FORMAT=ESM');
console.log('BETA4_UI_BASELINE_SHELL_MARKER=PASSED');
console.log('BETA4_UI_BASELINE_TOKEN_LAYER=PASSED');
console.log('BETA4_UI_AUDIT_NAVIGATION=PASSED');
console.log('BETA4_UI_AUDIT_DASHBOARD=PASSED');
console.log('BETA4_UI_AUDIT_PAGE_SURFACES=PASSED');
console.log('BETA4_UI_AUDIT_APP_ROUTING=PASSED');
console.log('BETA4_UI_UX_REDESIGN_BASELINE=PASSED');
