#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const versions = JSON.parse(read('release-versions.json'));
const fw = read('firmware/ArduinoLedController/ArduinoLedController.ino');
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const firmware = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const i18n = read('desktop-tauri/src/i18n/index.tsx');
assert.ok(
  fw.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`),
  `A firmware forrás nem a release-versions.json szerinti verziót használja: ${versions.firmware}`
);
assert.match(fw, /HTTP_WRITE_CHUNK_SIZE = 512/);
assert.match(fw, /HTTP_RESPONSE_SETTLE_DELAY_MS = 8UL/);
assert.match(fw, /HTTP_READ_TIMEOUT = 350UL/);
for (const token of ['create_schedule_backup','list_schedule_backups','firmware_releases','firmware_install_release','firmware_artifact_from_release']) assert.ok(rust.includes(token), token);
for (const token of ['schedules.deleteAll','schedules.deleteToken','restoreScheduleBackup']) assert.ok(schedules.includes(token), token);
for (const value of [
  'Összes időzítés törlése',
  'Delete all schedules',
  'Alle Zeitpläne löschen'
]) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    i18n,
    new RegExp(
      `["']schedules\\.deleteAll["']\\s*:\\s*["']${escaped}["']`
    ),
    `Hiányzó schedules.deleteAll fordítás: ${value}`
  );
}
for (const token of ['firmware.catalog','Stable / main','firmwareInstallRelease','SHA-256']) assert.ok(firmware.includes(token), token);
console.log(`OK: firmware teljesítményprofil ${versions.firmware}`);
console.log('OK: teljes schedule törlés, automatikus backup és visszaállítás');
console.log('OK: Stable/Beta GitHub firmware-katalógus és kiválasztott release OTA');
for (const token of [
  'firmware_version_from_release',
  'firmware_version_is_prerelease',
  'firmware_release_channel',
  'Stabil firmware-re nincs fallback',
  'CSATORNA_ELTÉRÉS'
]) assert.ok(rust.includes(token), token);
assert.match(rust, /filter_map\(firmware_artifact_from_release\)[\s\S]*artifact\.channel == channel\.trim\(\)/);
assert.doesNotMatch(rust, /release_matches_channel\(release, channel\.trim\(\)\)[\s\S]*filter_map\(firmware_artifact_from_release\)/);
console.log('OK: firmware csatorna a firmware-verzió és a GitHub prerelease jelölés együttes ellenőrzésével védett');
