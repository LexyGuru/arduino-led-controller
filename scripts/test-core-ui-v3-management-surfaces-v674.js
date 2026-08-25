#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p,'utf8');

const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const firmware = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const logs = read('desktop-tauri/src/pages/LogsPage.tsx');
const settings = read('desktop-tauri/src/pages/SettingsPage.tsx');
const css = read('desktop-tauri/src/core-ui-v3.css');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const release = JSON.parse(read('release-versions.json'));
const manifest = JSON.parse(read('scripts/test-suite-v2.json'));

assert.equal(release.application, versionSsot.application);
assert.equal(release.firmwareRelease.recommendedVersion, versionSsot.firmware);
assert.equal(release.firmwareRelease.channel, 'beta');
assert.match(types,/THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types,/CORE_UI_VERSION = '3\.0'/);

assert.match(schedules,/data-core-management="schedules"/);
assert.match(firmware,/data-core-management="firmware"/);
assert.match(logs,/data-core-management="logs"/);
assert.match(settings,/data-core-management="settings"/);

assert.match(schedules,/core-v3-management-actions/);
assert.match(firmware,/core-v3-management-actions/);
assert.match(logs,/core-v3-observability-toolbar/);
assert.match(logs,/core-v3-observability-summary/);
assert.match(settings,/core-v3-settings-tabs/);
assert.match(settings,/core-v3-settings-actions/);

for (const token of [
  'V674 — Core UI 3.0 management surfaces',
  '--core-management-gap',
  '.core-v3-management-page',
  '.core-v3-management-actions',
  '.core-v3-schedules-page',
  '.core-v3-firmware-page',
  '.core-v3-observability-toolbar',
  '.core-v3-observability-summary',
  '.core-v3-settings-hub-nav',
  '.core-v3-settings-actions',
  '@media (max-width: 560px)',
  '@media (prefers-reduced-motion: reduce)'
]) assert.ok(css.includes(token),`Missing V674 token: ${token}`);

for (const themeToken of [
  'var(--ds-accent)',
  'var(--ds-surface-raised)',
  'var(--ds-border)',
  'var(--ds-text)',
  'var(--ds-shadow)'
]) assert.ok(css.includes(themeToken),`Theme token missing: ${themeToken}`);

// Functional behavior preservation.
assert.match(schedules,/deleteAllSchedules/);
assert.match(schedules,/exportJson/);
assert.match(schedules,/importJson/);
assert.match(schedules,/restoreScheduleBackup/);
assert.match(schedules,/saveDraft/);
assert.match(firmware,/createOta2LiveInstallController/);
assert.match(firmware,/createOta2RecoveryCoordinator/);
assert.match(firmware,/firmwareInstallRelease/);
assert.match(logs,/createDiagnosticsZip/);
assert.match(logs,/exportDiagnostics/);
assert.match(logs,/exportLogs/);
assert.match(settings,/timezoneSnapshot/);
assert.match(settings,/validKey/);
assert.match(settings,/firmwareUpdateChannel/);
assert.match(settings,/otaUploadMode/);

assert.equal(manifest.current.includes('test:core-ui-v3-management-surfaces'),true);

console.log('V674_SCHEDULES_MANAGEMENT_SURFACE=PASSED');
console.log('V674_FIRMWARE_OTA_MANAGEMENT_SURFACE=PASSED');
console.log('V674_LOGS_OBSERVABILITY_SURFACE=PASSED');
console.log('V674_SETTINGS_MANAGEMENT_SURFACE=PASSED');
console.log('V674_FUNCTIONAL_BEHAVIOR_PRESERVED=PASSED');
console.log('V674_THEME_ENGINE_TOKEN_WIRING=PASSED');
