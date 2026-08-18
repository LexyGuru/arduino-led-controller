#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');

const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-final-ui-layout-qa.css');
const shell=read('desktop-tauri/src/v551-beta4-shell-dashboard-redesign.css');
const ledSchedules=read('desktop-tauri/src/v551-beta4-led-schedules-redesign.css');
const firmwareCss=read('desktop-tauri/src/v551-beta4-firmware-update-center-redesign.css');
const logsCss=read('desktop-tauri/src/v551-beta4-logs-audit-redesign.css');
const settingsCss=read('desktop-tauri/src/v551-beta4-settings-consistency-sweep.css');
const app=read('desktop-tauri/src/App.tsx');
const logs=read('desktop-tauri/src/pages/LogsPage.tsx');
const schedules=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const leds=read('desktop-tauri/src/pages/LedsPage.tsx');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');

assert.match(main,/import '\.\/v551-beta4-final-ui-layout-qa\.css';/);
assert.match(app,/core-ui-v20/);

for(const marker of [
  '.core-ui-v20 .core-topbar-kicker',
  '.beta4-leds-page .v5-led-bulk-actions',
  '.beta4-schedules-redesign .page-actions',
  '.beta4-firmware-redesign .beta3-update-grid',
  '.beta4-logs-redesign .v55-log-layout',
  '.beta4-settings-redesign .settings-grid',
  '@media (max-width: 900px)',
  '@media (max-width: 640px)'
]) assert.ok(css.includes(marker),marker);

assert.ok(css.includes('flex-wrap: wrap'));
assert.ok(css.includes('grid-template-columns: minmax(0, 1fr);'));
assert.ok(css.includes('overflow-x: clip'));

for(const [base,marker] of [
  [shell,'.beta4-ui-baseline .core-topbar'],
  [ledSchedules,'.beta4-leds-page .led-grid'],
  [ledSchedules,'.beta4-schedules-redesign .page-actions'],
  [firmwareCss,'.beta4-firmware-redesign .beta3-update-grid'],
  [logsCss,'.beta4-logs-redesign .v55-log-layout'],
  [settingsCss,'.beta4-settings-redesign .settings-grid']
]) assert.ok(base.includes(marker),`base selector missing: ${marker}`);

assert.ok(leds.includes('beta4-leds-page'));
assert.ok(schedules.includes('beta4-schedules-redesign'));
assert.ok(firmware.includes('beta4-firmware-redesign'));
assert.ok(logs.includes('beta4-logs-redesign'));
assert.ok(settings.includes('beta4-settings-redesign'));

console.log('V549_TOPBAR_BADGE_SEPARATION=PASSED');
console.log('V549_LED_TOOLBAR_RESPONSIVE=PASSED');
console.log('V549_SCHEDULE_ACTION_WRAP=PASSED');
console.log('V549_FIRMWARE_UPDATE_CENTER_LAYOUT=PASSED');
console.log('V549_LOGS_FULL_WIDTH_LAYOUT=PASSED');
console.log('V549_SETTINGS_RESPONSIVE_DENSITY=PASSED');
console.log('V549_HORIZONTAL_OVERFLOW_GUARD=PASSED');
console.log('V549_FINAL_UI_LAYOUT_QA=PASSED');
