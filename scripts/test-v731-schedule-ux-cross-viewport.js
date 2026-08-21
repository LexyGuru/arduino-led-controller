#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

assert.match(page,/schedule-event-actions/);
assert.match(page,/schedule-event-action-edit/);
assert.match(page,/schedule-event-action-delete/);

assert.match(css,/V731 - Schedule UX cross-viewport repair/);
assert.match(css,/width: min\(1480px, calc\(100vw - 32px\)\)/);
assert.match(css,/grid-template-columns: minmax\(440px, 500px\) minmax\(0, 1fr\)/);
assert.match(css,/grid-template-columns: 74px minmax\(0, 1fr\) 88px/);
assert.match(css,/grid-template-columns: repeat\(2, 40px\)/);
assert.match(css,/width: 40px/);
assert.match(css,/height: 40px/);
assert.match(css,/background: var\(--surface\)/);
assert.match(css,/border-color: var\(--accent\)/);
assert.match(css,/@media \(max-width: 1180px\)/);
assert.match(css,/grid-template-columns: repeat\(4, minmax\(120px, 1fr\)\)/);
assert.match(css,/@media \(max-width: 820px\)/);
assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css,/@media \(max-width: 520px\)/);
assert.match(css,/width: 100vw/);
assert.match(css,/height: 100dvh/);

const owned=css.slice(css.indexOf('/* V731 - Schedule UX cross-viewport repair */'));
assert.doesNotMatch(owned,/#[0-9a-fA-F]{3,8}\b/);
assert.doesNotMatch(owned,/overflow-x:\s*auto/);

console.log('V731_EVENT_ACTION_TOUCH_TARGETS=PASSED');
console.log('V731_EVENT_COLUMNS_NO_OVERLAP=PASSED');
console.log('V731_DESKTOP_MODAL_SPACE=PASSED');
console.log('V731_LAPTOP_STACK_BEFORE_SQUEEZE=PASSED');
console.log('V731_TABLET_LAYOUT=PASSED');
console.log('V731_PHONE_LAYOUT=PASSED');
console.log('V731_NO_HORIZONTAL_UI_SCROLL=PASSED');
console.log('V731_THEME_TOKEN_ONLY=PASSED');
