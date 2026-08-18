#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('desktop-tauri/src/app-startup-motion.css','utf8');

assert.match(css,/\.app-startup-screen\{[^}]*position:fixed[^}]*inset:0[^}]*overflow:hidden/);
assert.match(css,/\.app-startup-card\{[^}]*max-height:min\(760px,calc\(100dvh - 48px\)\)[^}]*overflow:hidden/);
assert.match(css,/\.app-startup-card\{[^}]*overscroll-behavior:none[^}]*touch-action:none/);
assert.doesNotMatch(css,/\.app-startup-card\{[^}]*overflow:auto/);
assert.match(css,/@media\(max-height:760px\)\{/);
assert.match(css,/@media\(max-height:760px\)\{[\s\S]*\.app-startup-check\{min-height:44px/);

console.log('V622_STARTUP_OVERLAY_SCROLL_LOCK=PASSED');
console.log('V622_STARTUP_CARD_SCROLL_REMOVED=PASSED');
console.log('V622_SHORT_VIEWPORT_COMPACT_LAYOUT=PASSED');
