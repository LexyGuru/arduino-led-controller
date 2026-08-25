#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const firmware=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const codes=read('desktop-tauri/src/utils/firmwareEventCodes.ts');
const runtime=read('scripts/fixtures/i18n-embedded-en-compat-v800.txt');
const css=read('desktop-tauri/src/core-ui-v3.css');
const readme=read('README.md');

assert.match(readme,/^# Arduino LED Controller V5\.8$/m);
assert.match(settings,/ledTopologyFeedback/);
assert.match(settings,/settings\.ledTopology\.saved/);
assert.match(settings,/role="status" aria-live="polite"/);
assert.match(settings,/role="alert" aria-live="assertive"/);

assert.match(firmware,/logCode\("error", "X3102"\)/);
assert.match(firmware,/logCodef\("success", "X3101"/);
assert.match(codes,/X3101:\['lx001Old','lx001New','lx002Old','lx002New','lx003Old','lx003New','revision'\]/);

assert.equal((runtime.match(/["']firmwareEvent\.X3101["']\s*:/g)||[]).length,3);
assert.equal((runtime.match(/["']firmwareEvent\.X3102["']\s*:/g)||[]).length,3);
assert.equal((runtime.match(/["']settings\.ledTopology\.saved["']\s*:/g)||[]).length,3);

const owned=css.slice(css.indexOf('/* V740 - Mobile schedule timeline + topology feedback */'));
assert.match(owned,/\.visual31-management-schedule-timeline > \.visual31-management-section-title \{\s*display: none !important;/s);
assert.match(owned,/max-height: min\(250px, 30dvh\)/);
assert.match(owned,/overflow-y: auto/);
assert.match(owned,/overflow-x: hidden/);
assert.doesNotMatch(owned,/overflow-x:\s*auto/);

console.log('V740_README_V58_HEADING=PASSED');
console.log('V740_TOPOLOGY_APP_FEEDBACK=PASSED');
console.log('V740_TOPOLOGY_FIRMWARE_LOGGING=PASSED');
console.log('V740_TOPOLOGY_LOG_LOCALIZATION=PASSED');
console.log('V740_MOBILE_TIMELINE_HEADER_REMOVED=PASSED');
console.log('V740_MOBILE_MODAL_LIST_BOUNDED=PASSED');
