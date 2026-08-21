#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

const marker='<section className="panel visual31-management-schedule-timeline schedule-unified-workspace" data-schedule-unified="v1">';
const timelineStart=page.indexOf(marker);
assert.ok(timelineStart>=0);
const modalStart=page.indexOf('{scheduleModalOpen && createPortal((');
assert.ok(modalStart>=0,'schedule modal portal invocation missing');
assert.match(page,/import \{ createPortal \} from 'react-dom';/);
assert.match(page,/document\.body\)\}/);

assert.match(page,/schedule-modal-list-pane/);
assert.match(page,/schedule-modal-editor-pane/);
assert.equal((page.match(/className="schedule-modal-backdrop"/g)||[]).length,1);
assert.equal((page.match(/id="schedule-editor"/g)||[]).length,1);
assert.doesNotMatch(page,/day\.items\.slice\(0, 6\)/);

assert.match(css,/V730 - True viewport modal \+ desktop two-panel schedule workspace/);
assert.match(css,/width: min\(1320px, calc\(100vw - 64px\)\)/);
assert.match(css,/height: 100dvh/);
assert.match(css,/grid-template-columns: minmax\(330px, 390px\) minmax\(0, 1fr\)/);
assert.match(css,/schedule-modal-list-pane/);
assert.match(css,/schedule-modal-editor-pane/);
assert.match(css,/@media \(max-width: 820px\)/);
assert.match(css,/white-space: nowrap/);

const v730=css.slice(css.indexOf('/* V730 - True viewport modal + desktop two-panel schedule workspace */'));
assert.doesNotMatch(v730,/#[0-9a-fA-F]{3,8}\b/);

console.log('V730_MODAL_PORTALED_TO_BODY=PASSED');
console.log('V730_TRUE_VIEWPORT_BACKDROP=PASSED');
console.log('V730_DESKTOP_TWO_PANEL_LAYOUT=PASSED');
console.log('V730_TABLET_STACK_BREAKPOINT=PASSED');
console.log('V730_PHONE_FULLSCREEN_LAYOUT=PASSED');
console.log('V730_WEEKDAY_LABELS_NO_WRAP=PASSED');
