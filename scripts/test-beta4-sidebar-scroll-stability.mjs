#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('desktop-tauri/src/v551-beta4-shell-dashboard-redesign.css','utf8');
const core=fs.readFileSync('desktop-tauri/src/core-ui-v1.5.css','utf8');

const match=css.match(/\.beta4-ui-baseline \.core-sidebar \{([\s\S]*?)\}/);
assert.ok(match,'Beta.4 sidebar block missing');
const block=match[1];

assert.match(block,/position:\s*fixed/);
assert.match(block,/z-index:\s*60/);
assert.match(block,/inset-block:\s*0/);
assert.match(block,/left:\s*0/);
assert.match(block,/height:\s*100dvh/);
assert.match(block,/overflow-y:\s*auto/);
assert.match(block,/overscroll-behavior:\s*contain/);
assert.doesNotMatch(block,/position:\s*sticky/);

assert.match(css,/\.beta4-ui-baseline \.content-shell \{[\s\S]*?grid-column:\s*2/);
assert.match(css,/@media \(max-width: 1180px\) and \(min-width: 821px\)[\s\S]*?\.beta4-ui-baseline \.core-sidebar[\s\S]*?width:\s*88px/);
assert.match(core,/@media \(max-width: 820px\)[\s\S]*?\.sidebar,[\s\S]*?\.core-sidebar[\s\S]*?display:\s*none !important/);
assert.match(core,/\.bottom-nav/);

console.log('BETA4_SIDEBAR_VIEWPORT_FIXED=PASSED');
console.log('BETA4_SIDEBAR_VERTICAL_SCROLL_SAFE=PASSED');
console.log('BETA4_CONTENT_GRID_COLUMN_PRESERVED=PASSED');
console.log('BETA4_TABLET_COMPACT_RAIL_PRESERVED=PASSED');
console.log('BETA4_MOBILE_BOTTOM_NAV_PRESERVED=PASSED');
console.log('BETA4_SIDEBAR_SCROLL_STABILITY=PASSED');
