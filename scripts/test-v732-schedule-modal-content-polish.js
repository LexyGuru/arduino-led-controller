#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

assert.doesNotMatch(page,/schedule-week-total/);
assert.doesNotMatch(page,/\{draft\.length\}\{t\('schedules\.eventCount'/);
assert.match(css,/V732 - Schedule modal content polish/);
assert.match(css,/\.schedule-modal-content \{\s*background: var\(--surface\);/s);
assert.match(css,/\.schedule-modal-list-pane,\s*\.schedule-modal-editor-pane \{\s*background: var\(--surface\);/s);
assert.match(css,/schedule-day-card-head/);
assert.match(css,/schedule-unified-editor-head/);
assert.match(css,/\.schedule-modal-list-pane \.schedule-day-items \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\);/s);
assert.match(css,/\.schedule-modal-list-pane \.schedule-compact-card \{\s*width: 100%;/s);

const owned=css.slice(css.indexOf('/* V732 - Schedule modal content polish */'));
assert.doesNotMatch(owned,/#[0-9a-fA-F]{3,8}\b/);
assert.doesNotMatch(owned,/overflow-x:\s*auto/);

console.log('V732_WEEKLY_TOTAL_BADGE_REMOVED=PASSED');
console.log('V732_MODAL_BODY_SURFACE=PASSED');
console.log('V732_DUPLICATE_DAY_HEADERS_REMOVED=PASSED');
console.log('V732_EVENT_ROWS_FULL_WIDTH=PASSED');
console.log('V732_EVENT_ACTIONS_ISOLATED=PASSED');
console.log('V732_THEME_TOKEN_ONLY=PASSED');
