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

for (const marker of [
  'ARDUINO DIRECT API V1',
  'Arduino lista betöltése',
  'Mentés Arduino-ra',
  'expectedRevision',
  'state.canWrite',
  'deleteAllSchedules',
  'restoreScheduleBackup',
  'createScheduleBackup',
  'listScheduleBackups',
  'TÖRLÉS'
]) {
  assert.match(schedules, new RegExp(marker));
}

assert.doesNotMatch(schedules, /A V5 szerverlista az elsődleges/);
assert.doesNotMatch(schedules, /Runner kézi futtatása/);

for (const marker of [
  'releaseCatalog',
  'firmwareReleases',
  'firmwareInstallRelease',
  'GitHub Releases',
  'SHA-256',
  'Megszakítás',
  'rollback'
]) {
  assert.match(firmware, new RegExp(marker, 'i'));
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
  'Közös konzolcache',
  'BIZTONSÁGI AUDIT',
  'EVENT BUS',
  'V5LogToolbar'
]) {
  assert.match(logs, new RegExp(marker));
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
