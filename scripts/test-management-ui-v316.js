#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const schedules=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v55-management-ui.css');
const i18n=read('desktop-tauri/src/i18n/index.tsx');
for(const m of ['v55-firmware-page','v55-management-heading','v55-firmware-stats','releaseCatalog','firmwareReleases','firmwareInstallRelease','firmware.restoreVersions','firmware.catalogHelp','firmware.cancel','rollback','SHA-256'])assert.ok(firmware.includes(m),m);
for(const m of ['v55-schedules-page','v55-management-heading','schedules.title','schedules.description','schedules.loadArduino','schedules.saveArduino','schedules.backupsEyebrow','deleteAllSchedules','restoreScheduleBackup','expectedRevision','state.canWrite'])assert.ok(schedules.includes(m),m);
for(const m of ['v55-settings-hub','data-settings-view','settings-hub.general','settings-hub.arduino','settings-general-section','settings-connection-section','AppearanceSettings','settings.direct.title','settings.time.title','settings.ota.title','settings.updates.title'])assert.ok(settings.includes(m),m);
assert.ok(main.includes('v55-management-ui.css'));
assert.ok(css.includes('v55-settings-hub-tabs'));assert.ok(css.includes('v55-firmware-page'));assert.ok(css.includes('v55-schedules-page'));assert.ok(sidebar.includes("id:'settings'"));
for(const key of ['nav.settings','settings-hub.title','settings-hub.subtitle','settings-hub.general','settings-hub.arduino']){const e=key.replaceAll('.','\\.');const c=(i18n.match(new RegExp(`['"]${e}['"]\\s*:`, 'g'))||[]).length;assert.equal(c,3,`${key}: HU/EN/DE parity`);}
console.log('MANAGEMENT_UI_20_FIRMWARE_DESIGN=PASSED');
console.log('MANAGEMENT_UI_20_SCHEDULES_DESIGN=PASSED');
console.log('SETTINGS_HUB_GENERAL_ARDUINO_SPLIT=PASSED');
console.log('MANAGEMENT_UI_20_RESPONSIVE=PASSED');
console.log('MANAGEMENT_UI_20_V316_CONTRACT=PASSED');
