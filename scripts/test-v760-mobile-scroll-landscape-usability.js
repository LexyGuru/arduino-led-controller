#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('desktop-tauri/src/core-ui-v3.css','utf8');
const schedules=fs.readFileSync('desktop-tauri/src/pages/SchedulesPage.tsx','utf8');
const logs=fs.readFileSync('desktop-tauri/src/pages/LogsPage.tsx','utf8');

assert.match(schedules,/className="schedule-mobile-workspace"/);
assert.match(schedules,/className="schedule-mobile-daybar"/);
assert.match(schedules,/\bschedule-desktop-workspace\b/);
assert.match(logs,/className="v55-log-controlbar core-v3-observability-toolbar"/);
assert.match(logs,/<V5LogToolbar/);

const marker='/* V760 - Mobile scroll flow + touch landscape schedule usability */';
const start=css.indexOf(marker);
assert.ok(start>=0,'V760 CSS marker missing');
const v760=css.slice(start);

assert.match(v760,/@media \(max-width: 820px\)/);
assert.match(v760,/visual31-schedules-page \.schedule-mobile-daybar,[\s\S]*?position: static !important;/);
assert.match(v760,/visual31-logs-page \.v55-log-controlbar,[\s\S]*?core-v3-observability-toolbar \{[\s\S]*?position: static !important;/);
assert.match(v760,/@media \(min-width: 821px\) and \(max-width: 960px\) and \(hover: none\),[\s\S]*\(pointer: coarse\)/);

const landscape=v760.slice(v760.indexOf('@media (min-width: 821px)'));
assert.match(landscape,/\.schedule-desktop-workspace \{\s*display: none !important;/s);
assert.match(landscape,/\.schedule-mobile-workspace \{[\s\S]*?display: grid;/);
assert.match(landscape,/\.schedule-mobile-week \{[\s\S]*?grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/);
assert.match(landscape,/\.schedule-modal-list-pane \{\s*display: none !important;/s);
assert.match(landscape,/\.schedule-modal-panel \{[\s\S]*?width: 100vw;[\s\S]*?height: 100dvh;/);
assert.match(landscape,/\.schedule-modal-content \{[\s\S]*?display: block;[\s\S]*?overflow-y: auto;/);
assert.match(landscape,/\.schedule-modal-editor-pane \{[\s\S]*?display: block;[\s\S]*?width: 100%;/);

const daybarStart=landscape.indexOf('.schedule-mobile-daybar {');
assert.ok(daybarStart>=0,'landscape daybar missing');
const daybarEnd=landscape.indexOf('}',daybarStart);
const daybar=landscape.slice(daybarStart,daybarEnd);
assert.doesNotMatch(daybar,/position:\s*sticky/);
assert.match(daybar,/position:\s*static/);
assert.doesNotMatch(v760,/overflow-x:\s*auto/);

console.log('V760_PORTRAIT_SCHEDULE_SCROLL_FLOW=PASSED');
console.log('V760_PORTRAIT_LOG_CONTROLS_SCROLL_FLOW=PASSED');
console.log('V760_IPHONE_LANDSCAPE_MOBILE_WORKSPACE=PASSED');
console.log('V760_IPHONE_LANDSCAPE_SINGLE_PANEL_EDITOR=PASSED');
console.log('V760_NO_HORIZONTAL_SCHEDULE_SCROLL=PASSED');
