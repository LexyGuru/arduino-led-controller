#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const page=fs.readFileSync('desktop-tauri/src/pages/LedsPage.tsx','utf8');
const css=fs.readFileSync('desktop-tauri/src/core-ui-v3.css','utf8');

assert.match(page,/className="visual31-led-preview__readout"/);
assert.match(page,/<strong>\{brightnessPercent\}%<\/strong>/);

const marker='/* V763 - LED preview readout containment */';
const start=css.indexOf(marker);
assert.ok(start>=0,'V763 CSS marker missing');
const owned=css.slice(start);

assert.match(owned,/\.visual31-led-control-center \.visual31-led-preview \{[\s\S]*width: 100%;[\s\S]*min-width: 0;/);
assert.match(owned,/\.visual31-led-control-center \.visual31-led-preview__readout \{[\s\S]*display: grid;[\s\S]*grid-template-columns: max-content minmax\(0, 1fr\);[\s\S]*width: 100%;[\s\S]*max-width: 100%;/);
assert.match(owned,/\.visual31-led-control-center \.visual31-led-preview__readout strong \{[\s\S]*white-space: nowrap;/);
assert.match(owned,/\.visual31-led-control-center \.visual31-led-preview__readout span \{[\s\S]*overflow: hidden;[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/);
assert.match(owned,/@media \(max-width: 430px\) \{[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*text-align: left;/);

console.log('V763_BRIGHTNESS_PERCENT_INSIDE_PREVIEW=PASSED');
console.log('V763_EFFECT_LABEL_CANNOT_PUSH_PERCENT_OUT=PASSED');
console.log('V763_NARROW_MOBILE_READOUT_STACK=PASSED');
