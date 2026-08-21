#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

assert.match(page,/scheduleModalOpen/);
assert.match(page,/setScheduleModalOpen\(true\)/);
assert.match(page,/role="dialog"/);
assert.match(page,/aria-modal="true"/);
assert.match(page,/schedule-modal-backdrop/);
assert.match(page,/schedule-modal-panel/);
assert.match(page,/schedule-modal-close/);
assert.match(page,/event\.key === 'Escape'/);
assert.match(page,/schedule-weekday-name/);
assert.doesNotMatch(page,/day\.items\.slice\(0, 6\)/);
assert.doesNotMatch(page,/className="visual31-week-event"/);
assert.match(page,/scheduleModalOpen && createPortal\(\(/);
assert.match(page,/document\.body\)\}/);
assert.equal((page.match(/id="schedule-editor"/g)||[]).length,1);

assert.match(css,/V728 - Responsive weekday-only map \+ modal editor/);
assert.match(css,/repeat\(7, minmax\(0, 1fr\)\)/);
assert.match(css,/@media \(max-width: 1100px\)/);
assert.match(css,/repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(css,/@media \(max-width: 720px\)/);
assert.match(css,/repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css,/@media \(max-width: 420px\)/);
assert.match(css,/height: 100dvh/);
assert.match(css,/position: fixed/);
assert.match(css,/overflow-y: auto/);
const v728Start=css.indexOf('/* V728 - Responsive weekday-only map + modal editor */');
assert.ok(v728Start>=0);
assert.doesNotMatch(css.slice(v728Start),/#[0-9a-fA-F]{3,8}\\b/);

console.log('V728_WEEKDAY_ONLY_MAP=PASSED');
console.log('V728_MODAL_PORTALED_TO_BODY=PASSED');
console.log('V728_THEME_TOKEN_ONLY_CSS=PASSED');
console.log('V728_MODAL_EDITOR=PASSED');
console.log('V728_TABLET_RESPONSIVE_GRID=PASSED');
console.log('V728_PHONE_RESPONSIVE_GRID=PASSED');
console.log('V728_NO_HORIZONTAL_SCHEDULE_TIMELINE=PASSED');
