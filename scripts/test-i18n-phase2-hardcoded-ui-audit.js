#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');
const schedules = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const dashboard = read('desktop-tauri/src/pages/DashboardPage.tsx');
const firmware = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');

for (const token of [
  'const dayKeys',
  'const dayShortKeys',
  'const effectKeys'
]) {
  assert.ok(
    schedules.includes(token),
    `Hiányzó Phase 2 szerkezeti elem: ${token}`
  );
}

for (const key of [
  'schedules.deleteToken',
  'schedules.effect',
  'schedules.exportShared',
  'schedules.imported',
  'schedules.conflictTitle',
  'schedules.backupsEyebrow',
  'schedules.eventCount',
  'dashboard.scheduleCountMismatch',
  'firmware.targetFromConfig'
]) {
  assert.ok(
    schedules.includes(key) ||
      dashboard.includes(key) ||
      firmware.includes(key),
    `Hiányzó Phase 2 i18n használat: ${key}`
  );
}

for (const legacy of [
  'const DAYS =',
  'const DAY_SHORT =',
  'const EFFECTS =',
  'JSON időzítés',
  'időzítés exportálva mobilos megosztással',
  'Letöltési hiba:',
  'Feltöltési hiba:',
  'AUTOMATIKUS BACKUPOK',
  'title="Törlés"',
  'A V5 szerver Arduino-beállításából származik'
]) {
  assert.ok(
    !schedules.includes(legacy) &&
      !dashboard.includes(legacy) &&
      !firmware.includes(legacy),
    `Beégetett Phase 2 UI-szöveg maradt: ${legacy}`
  );
}

for (const key of [
  'daysShort.1',
  'daysShort.7',
  'schedules.deleteToken',
  'schedules.effect',
  'schedules.exportShared',
  'schedules.exportSaved',
  'schedules.imported',
  'schedules.recoveredLegacy',
  'schedules.emptyRecords',
  'schedules.conflictTitle',
  'schedules.conflictHelp',
  'schedules.backupsEyebrow',
  'schedules.recordCount',
  'schedules.restoreButton',
  'schedules.eventCount',
  'schedules.ledSummary',
  'dashboard.scheduleCountMismatch',
  'firmware.targetFromConfig'
]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (i18n.match(new RegExp(`["']${escaped}["']`, 'g')) || []).length;
  assert.equal(count, 3, `Nem mindhárom nyelven létezik: ${key}`);
}

console.log('OK: Schedule napok, rövid napok és effektek teljesen i18n-alapúak');
console.log('OK: Schedule export/import, backup és konfliktusüzenetek fordíthatók');
console.log('OK: Dashboard és Firmware maradék Phase 2 szövegei fordíthatók');
