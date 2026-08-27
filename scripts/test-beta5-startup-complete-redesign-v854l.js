#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('desktop-tauri/src/app-startup-motion.css','utf8');

assert.match(css,/V854L - Beta\.5 complete startup screen redesign/);
assert.match(css,/\.visual31-startup \.app-startup-card \{[\s\S]*grid-template-columns: 1fr;[\s\S]*grid-template-rows: auto auto auto auto;/);
assert.match(css,/\.visual31-startup \.app-startup-brand \{[\s\S]*grid-template-columns: 72px minmax\(0, 1fr\) auto;/);
assert.match(css,/\.visual31-startup \.app-startup-truth-rail \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
assert.match(css,/\.visual31-startup \.app-startup-checks \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
assert.match(css,/\.visual31-startup \.app-startup-check__copy strong,[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
assert.match(css,/@media \(max-width: 820px\) \{[\s\S]*\.visual31-startup \.app-startup-checks \{[\s\S]*grid-template-columns: 1fr;/);
assert.match(css,/@media \(min-width: 821px\) and \(max-height: 760px\) \{[\s\S]*\.visual31-startup \.app-startup-card \{/);
assert.doesNotMatch(css,/V854L[\s\S]*overflow-y:\s*(auto|scroll)/);

console.log('V854L_STARTUP_SINGLE_COMMAND_CARD=PASSED');
console.log('V854L_STARTUP_DESKTOP_TWO_COLUMN_CHECK_GRID=PASSED');
console.log('V854L_STARTUP_MOBILE_SINGLE_COLUMN=PASSED');
console.log('V854L_STARTUP_LONG_LANGUAGE_WRAP=PASSED');
console.log('V854L_STARTUP_SHORT_VIEWPORT_COMPACT_MODE=PASSED');
console.log('V854L_STARTUP_NO_SCROLL_CONTRACT_PRESERVED=PASSED');
