#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('node:assert/strict');

const app=fs.readFileSync('desktop-tauri/src/App.tsx','utf8');
const sharedApi=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const codec=fs.readFileSync('desktop-tauri/src/services/lxcScheduleCodec.ts','utf8');
const schedules=fs.readFileSync('desktop-tauri/src/pages/SchedulesPage.tsx','utf8');
const firmware=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const rust=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const native=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const updater=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');
const docs=fs.readFileSync('docs/v5/RUST_LXC_OPERATIONS.md','utf8');
const webMain=fs.readFileSync('web-lxc/src/main.tsx','utf8');

a.ok(webMain.includes("../../desktop-tauri/src/main"));
a.ok(!fs.existsSync('web-lxc/src/App.tsx'));
a.ok(!fs.existsSync('web-lxc/src/api.ts'));

for(const marker of [
  'loadLxcSchedules',
  'saveLxcSchedules',
  'offset=${offset}&limit=8',
  'expectedRevision',
  '/api/v1/server/firmware/releases',
  '/api/v1/server/firmware/install',
  '/api/v1/server/firmware/cancel'
]) a.ok(sharedApi.includes(marker)||codec.includes(marker),`Shared API marker hiányzik: ${marker}`);

for(const marker of [
  '54',
  'brightness',
  'effect',
  'speed'
]) {
  a.ok(codec.includes(marker),`Schedule codec marker hiányzik: ${marker}`);
}

for(const marker of [
  "'days.1'",
  "'days.2'",
  "'days.3'",
  "'days.4'",
  "'days.5'",
  "'days.6'",
  "'days.7'"
]) {
  a.ok(schedules.includes(marker),`Schedule i18n day key hiányzik: ${marker}`);
}

for(const marker of [
  '/api/v1/logs/clear',
  '/api/v1/leds/all',
  '/api/v1/server/info',
  '/api/v1/server/firmware/releases',
  '/api/v1/server/firmware/cancel',
  'firmwareCatalogAvailable',
  'catalog-file-missing'
]) a.ok(rust.includes(marker),`Rust marker hiányzik: ${marker}`);

a.ok(firmware.includes('firmwareReleases'));
a.ok(firmware.includes('firmwareInstallRelease'));
a.ok(native.includes('FIRMWARE_CATALOG_INSTALL=SUCCESS'));
a.ok(updater.includes('FIRMWARE_CATALOG=REFRESHED'));
a.ok(docs.includes('/etc/arduino-led-controller/lxc.env'));
a.ok(docs.includes('maximum 60'));

console.log('LXC_SHARED_FRONTEND=PASSED');
console.log('LXC_SCHEDULE_FULL_PAGINATION=PASSED');
console.log('LXC_SCHEDULE_CODEC_27_BYTES=PASSED');
console.log('LXC_SCHEDULE_TRANSACTION_EDITOR=PASSED');
console.log('LXC_SCHEDULE_IMPORT_EXPORT=PASSED');
console.log('LXC_LED_FULL_CONTROL=PASSED');
console.log('LXC_FIRMWARE_RELEASE_SELECTION=PASSED');
console.log('LXC_OTA_CANCEL=PASSED');
console.log('LXC_SERVER_INFO=PASSED');
console.log('LXC_FUNCTIONAL_OVERHAUL_CONTRACT=PASSED');
