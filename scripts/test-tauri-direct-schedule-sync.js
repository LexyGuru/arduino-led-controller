'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const api = read('desktop-tauri/src/services/tauriApi.ts');
const controller = read('desktop-tauri/src/hooks/useController.ts');
const hook = read('desktop-tauri/src/hooks/useV5Schedules.ts');
const page = read('desktop-tauri/src/pages/SchedulesPage.tsx');
const app = read('desktop-tauri/src/App.tsx');
const dashboard = read('desktop-tauri/src/pages/DashboardPage.tsx');
const types = read('desktop-tauri/src/types/index.ts');
const docs = read('docs/architecture/TAURI_DIRECT_API_V1_SCHEDULE_SYNC.md');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');

for (const token of [
  'struct ScheduleSyncSnapshot',
  'empty_action_count: usize',
  'recovered_legacy_action_count: usize',
  'async fn fetch_schedule_snapshot',
  'SCHEDULE_AUTO_SYNC_FAILED:',
  'SCHEDULE_CONFLICT:',
  'expected_revision: Option<u64>',
  'write_schedule_cache(&app, verified.schedules.clone())?',
  'empty_action_schedule_roundtrips_without_being_dropped',
  'missing_apply_flag_is_recovered_from_preserved_led_payload'
]) {
  assert.ok(rust.includes(token), `Hiányzó Rust schedule-védelem: ${token}`);
}

assert.ok(
  !rust.includes('s.time.len() != 5 || s.leds.is_empty()'),
  'Az üres LED-műveletű Arduino rekordot nem szabad eldobni.'
);

const saveFunction = rust.match(
  /async fn save_and_sync_schedules[\s\S]*?\n}\n\n#\[tauri::command\]\nasync fn firmware_status/
)?.[0] || '';

assert.ok(saveFunction, 'A schedule mentési parancs nem található.');
assert.ok(
  saveFunction.indexOf('write_schedule_cache(&app, verified.schedules.clone())?') >
    saveFunction.indexOf('let verified = fetch_schedule_snapshot(&state).await?'),
  'A helyi cache csak a teljes Arduino readback után írható.'
);
assert.ok(
  !saveFunction.includes('schedule_file_bytes(schedules.clone())'),
  'A mentés elején nem írható felül a helyi cache.'
);

assert.ok(
  saveFunction.includes('let synchronized = fetch_schedule_snapshot(&state).await.map_err'),
  'Hiányzó automatikus Arduino előszinkron revision nélküli mentésnél.'
);
assert.ok(
  saveFunction.includes('write_schedule_cache(&app, synchronized.schedules)?'),
  'Az automatikus előszinkron eredményét helyi cache-be kell írni.'
);
assert.ok(
  saveFunction.includes('synchronized.revision'),
  'Az automatikusan letöltött revisiont kell használni a konfliktusvédelemhez.'
);
assert.ok(
  !saveFunction.includes('SCHEDULE_SYNC_REQUIRED:'),
  'Az automatikus előszinkron mellett nem maradhat kötelező kézi sync hiba.'
);

for (const token of [
  'ScheduleSyncSnapshot',
  'ScheduleSaveResult',
  'expectedRevision',
  'force'
]) {
  assert.ok(api.includes(token), `Hiányzó Tauri API típus/szerződés: ${token}`);
}

for (const token of [
  'ScheduleSyncState',
  "status: 'verified'",
  'await tauriApi',
  '.loadSchedulesFromArduino()',
  '.saveSchedules(',
  'throw error',
  'scheduleAutoSyncKey'
]) {
  assert.ok(controller.includes(token), `Hiányzó controller schedule-védelem: ${token}`);
}

for (const token of [
  'await directSync()',
  'await directSave(',
  'remoteRevision',
  'canWrite',
  'SCHEDULE_CONFLICT',
  'SCHEDULE_SYNC_REQUIRED'
]) {
  assert.ok(hook.includes(token), `Hiányzó Direct hook-védelem: ${token}`);
}
assert.ok(!hook.includes('api.schedules'), 'A schedule oldal nem függhet V5 API v2 szerverlistától.');
assert.ok(!hook.includes('useDesktopApi'), 'A Direct schedule hook nem használhat V5 kapcsolatot.');

for (const token of [
  'schedules.title',
  'schedules.description',
  'schedules.loadArduino',
  'schedules.saveArduino',
  'schedules.backupsEyebrow',
  'state.canWrite',
  'emptyActionCount',
  'recoveredLegacyActionCount',
  'schedules.noLedAction'
]) {
  assert.ok(page.includes(token), `Hiányzó Direct schedule UI: ${token}`);
}
assert.ok(!page.includes('A V5 szerverlista az elsődleges'));
assert.ok(!page.includes('Runner kézi futtatása'));
assert.ok(!page.includes('Szinkron Arduino-ra'));

assert.ok(app.includes('scheduleSync={'));
assert.ok(app.includes('expectedRevision'));
assert.ok(!app.includes('void controller\n                    .saveSchedules'));
assert.ok(!app.includes('void controller\n                    .syncSchedulesFromArduino'));

assert.ok(dashboard.includes('dashboard.loadedList'));
assert.ok(dashboard.includes('scheduleSync'));

for (const token of [
  'export interface ScheduleSyncSnapshot',
  'export interface ScheduleSaveResult',
  'export interface ScheduleSyncState'
]) {
  assert.ok(types.includes(token), `Hiányzó TypeScript schedule típus: ${token}`);
}

for (const token of [
  'Arduino az elsődleges adatforrás',
  'cache csak a sikeres teljes readback után',
  'V5 szerver nélkül',
  'üres LED-műveletű rekord',
  'Örökölt vagy hiányzó `apply` jelző helyreállítása'
]) {
  assert.ok(docs.includes(token), `Hiányzó schedule dokumentáció: ${token}`);
}

console.log('OK: a teljes lapozott Arduino schedule-lista az elsődleges');
console.log('OK: a Direct mentés és letöltés Promise-ként meg van várva');
console.log('OK: revision-konfliktus és írásvédelmi kapu aktív');
console.log('OK: a cache csak sikeres commit/readback után frissül');
console.log('OK: az üres LED-műveletű rekordok megmaradnak és láthatók');
console.log('OK: a hiányzó apply jelző megmaradt LED-adatból helyreállítható');
