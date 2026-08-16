#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const leds=read('desktop-tauri/src/pages/LedsPage.tsx');
const schedules=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-led-schedules-redesign.css');
const pkg=JSON.parse(read('package.json'));

const semanticCall=(object,method)=>
  new RegExp(`${object}\\s*\\.\\s*${method}\\s*\\(`);

assert.match(leds,/className="page beta4-leds-page"/);
assert.match(schedules,/className="page v55-schedules-page beta4-schedules-redesign"/);
assert.match(main,/import '\.\/v551-beta4-led-schedules-redesign\.css';/);

for(const marker of [
  '.beta4-leds-page .led-grid',
  '.beta4-leds-page .led-card',
  '.beta4-leds-page .color-preview',
  '.beta4-leds-page .beta2-scene-panel',
  '.beta4-leds-page .test-panel',
  '.beta4-schedules-redesign .page-actions',
  '.beta4-schedules-redesign .schedule-card',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert.ok(css.includes(marker),`missing Beta.4 LED/Schedules visual contract: ${marker}`);
}

// Preserve functional contracts.
assert.match(leds,/const SEND_DELAY_MS =\s*4000/);
assert.match(leds,/scheduleSend/);
assert.match(leds,/useV5Leds/);
assert.match(leds,semanticCall('state','applyScene'));
assert.match(leds,semanticCall('state','runPreset'));

assert.match(schedules,/useV5Schedules/);
assert.match(schedules,semanticCall('tauriApi','createScheduleBackup'));
assert.match(schedules,/deleteAllSchedules/);
assert.match(schedules,/restoreScheduleBackup/);
assert.match(schedules,/scheduleFingerprint/);
assert.match(schedules,/SCHEDULE_CONFLICT/);
assert.match(schedules,semanticCall('tauriApi','exportSchedulesFile'));
assert.match(schedules,semanticCall('tauriApi','importSchedulesFile'));

assert.equal(
  pkg.scripts['test:beta4-led-schedules-redesign'],
  'node scripts/test-beta4-led-schedules-redesign.mjs'
);

console.log('BETA4_LED_GLASS_CARDS=PASSED');
console.log('BETA4_LED_COLOR_CONTROL_VISUAL=PASSED');
console.log('BETA4_LED_SCENE_TEST_VISUAL=PASSED');
console.log('BETA4_LED_SEMANTIC_CALL_CONTRACT=PASSED');
console.log('BETA4_LED_DEBOUNCE_4000MS_PRESERVED=PASSED');
console.log('BETA4_SCHEDULES_GLASS_LAYOUT=PASSED');
console.log('BETA4_SCHEDULE_BACKUP_CONTRACT_PRESERVED=PASSED');
console.log('BETA4_SCHEDULE_CONFLICT_CONTRACT_PRESERVED=PASSED');
console.log('BETA4_SCHEDULE_IMPORT_EXPORT_PRESERVED=PASSED');
console.log('BETA4_LED_SCHEDULES_REDESIGN=PASSED');
