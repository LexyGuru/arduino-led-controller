'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const firmware = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const logs = read('desktop-tauri/src/pages/LogsPage.tsx');
const scheduleHook = read('desktop-tauri/src/hooks/useV5Schedules.ts');
const firmwareHook = read('desktop-tauri/src/hooks/useV5Firmware.ts');
const tauriApi = read('desktop-tauri/src/services/tauriApi.ts');
const i18n = read('desktop-tauri/src/i18n/index.tsx');

for (const marker of [
  'schedules.title',
  'schedules.description',
  'schedules.loadArduino',
  'schedules.saveArduino',
  'schedules.backupsEyebrow',
  'schedules.deleteToken',
  'expectedRevision',
  'state.canWrite',
  'deleteAllSchedules',
  'restoreScheduleBackup',
  'createScheduleBackup',
  'listScheduleBackups'
]) {
  assert.match(
    schedules,
    new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );
}

assert.doesNotMatch(schedules, /A V5 szerverlista az elsődleges/);
assert.doesNotMatch(schedules, /Runner kézi futtatása/);

for (const marker of [
  'releaseCatalog',
  'firmwareReleases',
  'firmwareInstallRelease',
  'firmware.catalog',
  'firmware.restoreVersions',
  'firmware.catalogHelp',
  'SHA-256',
  'firmware.cancel',
  'rollback'
]) {
  assert.match(
    firmware,
    new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  );
}

assert.doesNotMatch(firmware, /V5FirmwareBackups/);

assert.match(
  tauriApi,
  /firmwareReleases:\s*\(\)\s*=>\s*invoke<FirmwareArtifact\[]>\('firmware_releases'\)/
);

assert.match(
  tauriApi,
  /firmwareInstallRelease:\s*\(tag:\s*string\)\s*=>\s*invoke<FirmwareStatus>\('firmware_install_release'/
);

for (const marker of [
  'createScheduleBackup',
  'listScheduleBackups'
]) {
  assert.match(tauriApi, new RegExp(marker));
}

for (const marker of [
  'logs.consoleCache',
  'logs.audit',
  'EVENT BUS',
  'V5LogToolbar'
]) {
  assert.match(
    logs,
    new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );
}

assert.match(scheduleHook, /SCHEDULE_CONFLICT/);
assert.match(scheduleHook, /await directSync\(\)/);
assert.match(scheduleHook, /await directSave\(/);
assert.doesNotMatch(scheduleHook, /api\.schedules/);

const updateBlock =
  firmwareHook.match(/const startUpdate =[\s\S]*?const cancel =/)?.[0] || '';

assert.doesNotMatch(updateBlock, /catch[\s\S]*directUpdate/);

console.log('OK: Direct Arduino schedule revision-konfliktus, automatikus backup, visszaállítás és teljes törlés UI');
console.log('OK: Stable/Beta GitHub firmware-katalógus és ellenőrzött rollback UI');
console.log('OK: konzol, audit, esemény és helyi hálózati napló UI');
console.log('OK: API-hiba után nincs automatikus dupla firmware-indítás');
