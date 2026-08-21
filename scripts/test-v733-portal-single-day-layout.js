#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

assert.match(page,/import \{ createPortal \} from 'react-dom';/);
assert.match(page,/scheduleModalOpen && createPortal\(\(/);
assert.match(page,/document\.body\)\}/);
assert.doesNotMatch(page,/className="schedule-week-grid"/);
assert.match(page,/className="schedule-modal-day-list"/);

assert.match(css,/V733 - Portal modal \+ canonical surfaces \+ isolated single-day list/);
assert.match(css,/\.schedule-modal-panel \{\s*background: var\(--ds-surface-raised\);/s);
assert.match(css,/\.schedule-modal-header \{\s*background: var\(--ds-surface-raised\);/s);
assert.match(css,/\.schedule-modal-content \{\s*background: var\(--ds-surface\);/s);
assert.match(css,/\.schedule-modal-list-pane \{\s*background: var\(--ds-surface\);/s);
assert.match(css,/\.schedule-modal-editor-pane \{\s*background: var\(--ds-surface\);/s);
assert.match(css,/\.schedule-modal-day-list \{[\s\S]*grid-template-columns: minmax\(0, 1fr\);/);
assert.match(css,/\.schedule-modal-day-list > \.schedule-day-card \{[\s\S]*width: 100%;/);
assert.match(css,/@media \(max-width: 820px\) \{[\s\S]*\.page-transition-stage \{[\s\S]*width: 100%;/);

const owned=css.slice(css.indexOf('/* V733 - Portal modal + canonical surfaces + isolated single-day list */'));
assert.doesNotMatch(owned,/#[0-9a-fA-F]{3,8}\b/);
assert.doesNotMatch(owned,/repeat\(4,/);
assert.doesNotMatch(owned,/repeat\(2,/);

console.log('V733_MODAL_PORTALED_TO_BODY=PASSED');
console.log('V733_PAGE_TRANSITION_STAGE_NO_LONGER_CONTAINS_MODAL=PASSED');
console.log('V733_CANONICAL_MODAL_SURFACES=PASSED');
console.log('V733_SINGLE_DAY_GRID_ISOLATED=PASSED');
console.log('V733_DAY_CARD_FULL_WIDTH=PASSED');
console.log('V733_MOBILE_STAGE_WIDTH_GUARD=PASSED');
