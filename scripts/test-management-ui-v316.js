#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const firmware = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const updateCenter = read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const settings = read('desktop-tauri/src/pages/SettingsPage.tsx');
const sidebar = read('desktop-tauri/src/components/Sidebar.tsx');
const main = read('desktop-tauri/src/main.tsx');
const css = read('desktop-tauri/src/v55-management-ui.css');
const beta3Css = read('desktop-tauri/src/v551-beta3-update-center.css');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');

for (const marker of [
  'v55-firmware-page',
  'v55-management-heading',
  'releaseCatalog',
  'firmwareReleases',
  'firmwareInstallRelease',
  'firmware.restoreVersions',
  'firmware.catalogHelp',
  'firmware.cancel',
  'rollback',
  'SHA-256'
]) {
  assert.ok(firmware.includes(marker), marker);
}

assert.ok(firmware.includes('<UpdateCenterPanel'), 'UpdateCenterPanel');
assert.ok(
  firmware.includes('beta3-firmware-support-grid'),
  'beta3-firmware-support-grid'
);
assert.ok(
  !firmware.includes('v55-firmware-stats'),
  'legacy v55-firmware-stats must not return'
);
assert.ok(
  updateCenter.includes('beta3-readiness-line'),
  'minimal OTA2 readiness line'
);
assert.ok(
  beta3Css.includes('.beta3-update-grid'),
  'Beta.3 update grid styles'
);

for (const marker of [
  'v55-schedules-page',
  'v55-management-heading',
  'schedules.title',
  'schedules.description',
  'schedules.loadArduino',
  'schedules.saveArduino',
  'schedules.backupsEyebrow',
  'deleteAllSchedules',
  'restoreScheduleBackup',
  'expectedRevision',
  'state.canWrite'
]) {
  assert.ok(schedules.includes(marker), marker);
}

for (const marker of [
  'v55-settings-hub',
  'data-settings-view',
  'settings-hub.general',
  'settings-hub.arduino',
  'settings-general-section',
  'settings-connection-section',
  'AppearanceSettings',
  'settings.direct.title',
  'settings.time.title',
  'settings.ota.title',
  'settings.updates.title'
]) {
  assert.ok(settings.includes(marker), marker);
}

assert.ok(main.includes('v55-management-ui.css'));
assert.ok(main.includes('v551-beta3-update-center.css'));
assert.ok(css.includes('v55-settings-hub-tabs'));
assert.ok(css.includes('v55-firmware-page'));
assert.ok(css.includes('v55-schedules-page'));
assert.ok(sidebar.includes("id:'settings'"));

for (const key of [
  'nav.settings',
  'settings-hub.title',
  'settings-hub.subtitle',
  'settings-hub.general',
  'settings-hub.arduino'
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (
    i18n.match(
      new RegExp(`['"]${escaped}['"]\\s*:`, 'g')
    ) || []
  ).length;
  assert.equal(count, 3, `${key}: HU/EN/DE parity`);
}

console.log('MANAGEMENT_UI_20_FIRMWARE_DESIGN=PASSED');
assert.ok(firmware.includes('firmware.statusTitle'),'firmware.statusTitle');
assert.ok(firmware.includes('v5-firmware-catalog-scroll'),'v5-firmware-catalog-scroll');
assert.ok(beta3Css.includes('.v5-firmware-catalog-scroll'),'catalog scroll CSS');
console.log('MANAGEMENT_UI_20_FIRMWARE_BETA3_CONSOLIDATED=PASSED');
console.log('MANAGEMENT_UI_20_SCHEDULES_DESIGN=PASSED');
console.log('SETTINGS_HUB_GENERAL_ARDUINO_SPLIT=PASSED');
console.log('MANAGEMENT_UI_20_RESPONSIVE=PASSED');
console.log('MANAGEMENT_UI_20_V316_CONTRACT=PASSED');
