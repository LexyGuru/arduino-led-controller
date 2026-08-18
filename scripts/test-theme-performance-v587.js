#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = [
  'desktop-tauri/src/theme-engine-v3.css',
  'desktop-tauri/src/app-startup-motion.css'
];
const text = files.map(p=>fs.readFileSync(p,'utf8')).join('\n');

const blurValues = [...text.matchAll(/\bblur\((\d+(?:\.\d+)?)px\)/g)].map(m=>Number(m[1]));
const maxBlur = blurValues.length ? Math.max(...blurValues) : 0;
const backdropCount = (text.match(/backdrop-filter\s*:/g) || []).length;
const fixedCount = (text.match(/position\s*:\s*fixed/g) || []).length;
const infiniteAnimations = (text.match(/\binfinite\b/g) || []).length;

assert.ok(maxBlur <= 40, `max blur ${maxBlur}px exceeds 40px budget`);
assert.ok(backdropCount <= 12, `backdrop-filter declarations ${backdropCount} exceed budget`);
assert.ok(fixedCount <= 10, `fixed layers ${fixedCount} exceed budget`);
assert.ok(infiniteAnimations <= 8, `infinite animations ${infiniteAnimations} exceed budget`);
assert.match(text, /prefers-reduced-motion\s*:\s*reduce/);

console.log(`V587_MAX_STATIC_BLUR_PX=${maxBlur}`);
console.log(`V587_BACKDROP_FILTER_DECLARATIONS=${backdropCount}`);
console.log(`V587_FIXED_LAYER_DECLARATIONS=${fixedCount}`);
console.log(`V587_INFINITE_ANIMATION_DECLARATIONS=${infiniteAnimations}`);
console.log('V587_STATIC_FX_PERFORMANCE_BUDGET=PASSED');
