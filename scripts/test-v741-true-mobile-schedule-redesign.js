#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('desktop-tauri/src/pages/SchedulesPage.tsx','utf8');
const css=fs.readFileSync('desktop-tauri/src/core-ui-v3.css','utf8');

assert.match(page,/className="schedule-mobile-workspace"/);
assert.match(page,/className="schedule-mobile-week"/);
assert.match(page,/className="[^"]*\bschedule-desktop-workspace\b[^"]*"/);
assert.match(page,/className="schedule-mobile-events"/);
assert.match(page,/className="schedule-mobile-event"/);
const mobileStart=page.indexOf('<section className="schedule-mobile-workspace"');
const desktopStart=page.indexOf('<section className="panel visual31-management-schedule-timeline schedule-unified-workspace schedule-desktop-workspace"',mobileStart);
assert.ok(mobileStart>=0,'mobile workspace source block missing');
assert.ok(desktopStart>mobileStart,'desktop workspace must follow mobile workspace');
const mobileBlock=page.slice(mobileStart,desktopStart);
assert.match(mobileBlock,/led\.enabled \? 'ON' : 'OFF'/);
assert.doesNotMatch(mobileBlock,/led\.action/);

const types=fs.readFileSync('desktop-tauri/src/types/index.ts','utf8');
const scheduleLedBlock=/export interface ScheduleLed \{([\s\S]*?)\n\}/.exec(types)?.[1]??'';
assert.match(scheduleLedBlock,/enabled: boolean;/);
assert.doesNotMatch(scheduleLedBlock,/action:/);

const owned=css.slice(css.indexOf('/* V741 - True mobile schedule redesign */'));
assert.match(owned,/\.schedule-mobile-workspace \{\s*display: none;/s);
assert.match(owned,/@media \(max-width: 820px\)/);
assert.match(owned,/\.schedule-desktop-workspace \{\s*display: none !important;/s);
assert.match(owned,/\.schedule-mobile-week \{[\s\S]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/);
assert.match(owned,/\.schedule-modal-list-pane \{\s*display: none !important;/s);
assert.match(owned,/\.schedule-modal-panel \{[\s\S]*width: 100vw;[\s\S]*height: 100dvh;/);
assert.match(owned,/\.schedule-modal-editor-pane \{[\s\S]*width: 100%;/);
assert.doesNotMatch(owned,/overflow-x:\s*auto/);

console.log('V741_SEPARATE_MOBILE_DOM=PASSED');
console.log('V741_ALL_SEVEN_DAYS_VISIBLE=PASSED');
console.log('V741_MOBILE_DAY_EVENT_LIST=PASSED');
console.log('V744_SCHEDULELED_MODEL_CONTRACT=PASSED');
console.log('V745_MOBILE_BLOCK_SCOPE_CONTRACT=PASSED');
console.log('V741_DESKTOP_WORKSPACE_HIDDEN_ON_MOBILE=PASSED');
console.log('V741_MOBILE_EDITOR_FULL_VIEWPORT=PASSED');
console.log('V741_MOBILE_LIST_EDITOR_SEPARATED=PASSED');
console.log('V741_NO_HORIZONTAL_MOBILE_SCROLL=PASSED');
