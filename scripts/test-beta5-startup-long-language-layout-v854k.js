#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('desktop-tauri/src/app-startup-motion.css','utf8');

assert.match(css,/V854K - Beta\.5 startup long-language layout hardening/);
assert.match(css,/\.visual31-startup \.app-startup-check \{[\s\S]*align-items: flex-start;[\s\S]*height: auto;[\s\S]*min-width: 0;/);
assert.match(css,/\.visual31-startup \.app-startup-check__copy strong,[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;[\s\S]*text-overflow: clip;/);
assert.match(css,/\.visual31-startup \.app-startup-check__copy strong \{[\s\S]*line-height: 1\.28;/);
assert.match(css,/\.visual31-startup \.app-startup-footer span \{[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
assert.match(css,/@media \(max-height: 760px\) \{[\s\S]*\.visual31-startup \.app-startup-check__copy strong \{[\s\S]*font-size: 12px;/);
assert.match(css,/@media \(max-width: 820px\) \{[\s\S]*\.visual31-startup \.app-startup-check__copy small \{[\s\S]*font-size: 10\.5px;/);
assert.match(css,/\.visual31-startup \.app-startup-card\{[\s\S]*overflow:hidden/);
assert.doesNotMatch(css,/V854K[\s\S]*overflow-y:\s*(auto|scroll)/);

console.log('V854K_STARTUP_LONG_TRANSLATION_WRAP=PASSED');
console.log('V854K_STARTUP_DYNAMIC_ROW_HEIGHT=PASSED');
console.log('V854K_STARTUP_COMPACT_VIEWPORT_TYPOGRAPHY=PASSED');
console.log('V854K_STARTUP_NO_SCROLL_CONTRACT_PRESERVED=PASSED');
