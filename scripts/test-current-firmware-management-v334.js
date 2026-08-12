#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');
const rv = JSON.parse(read('release-versions.json'));

const fw = read('firmware/ArduinoLedController/ArduinoLedController.ino');
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const firmwarePage = read('desktop-tauri/src/pages/FirmwarePage.tsx');

assert.equal(rv.firmware, '5.0.0-beta.7');
assert.ok(
  fw.includes(`#define FIRMWARE_VERSION "${rv.firmware}"`),
  'Firmware source/release manifest mismatch'
);

for (const token of [
  'create_schedule_backup',
  'list_schedule_backups',
  'firmware_artifacts_from_release',
  'firmware_releases',
  'firmware_install_release',
  'firmware_install_external',
  'firmware_status'
]) {
  assert.ok(rust.includes(token), `Missing current Rust marker: ${token}`);
}

for (const token of [
  'schedules.deleteAll',
  'restoreScheduleBackup'
]) {
  assert.ok(schedules.includes(token), `Missing schedule marker: ${token}`);
}

for (const token of [
  'firmware.catalog',
  'firmwareInstallRelease',
  'SHA-256'
]) {
  assert.ok(firmwarePage.includes(token), `Missing firmware UI marker: ${token}`);
}

assert.match(rust, /fn firmware_version_from_asset_name/);
assert.match(rust, /fn firmware_version_is_prerelease/);

console.log('CURRENT_FIRMWARE_RELEASE_CATALOG=PASSED');
console.log('CURRENT_SCHEDULE_BACKUP_RESTORE=PASSED');
console.log('CURRENT_FIRMWARE_CHANNEL_METADATA=PASSED');
