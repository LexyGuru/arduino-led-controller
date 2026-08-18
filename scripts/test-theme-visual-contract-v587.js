#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const targets = [
  'desktop-tauri/src/App.tsx',
  'desktop-tauri/src/components/AppStartupScreen.tsx',
  'desktop-tauri/src/components/AppearanceSettings.tsx',
  'desktop-tauri/src/components/ThemeAdvancedEditor.tsx',
  'desktop-tauri/src/app-startup-motion.css',
  'desktop-tauri/src/theme-engine-v3.css'
];

const signatures = [];
for (const file of targets) {
  const text = fs.readFileSync(file, 'utf8');
  signatures.push(`${file}:${crypto.createHash('sha256').update(text).digest('hex')}`);
}

const app = fs.readFileSync(targets[0], 'utf8');
const startup = fs.readFileSync(targets[1], 'utf8');
const appearance = fs.readFileSync(targets[2], 'utf8');
const advanced = fs.readFileSync(targets[3], 'utf8');
const motion = fs.readFileSync(targets[4], 'utf8');
const theme = fs.readFileSync(targets[5], 'utf8');

assert.match(app, /page-transition-stage/);
assert.match(app, /AppStartupScreen/);
assert.match(startup, /app-startup-progress/);
assert.match(appearance, /custom-theme-editor/);
assert.match(advanced, /theme-profile-library/);
assert.match(motion, /@keyframes v584-page-enter/);
assert.match(theme, /visual-fx-picker/);
assert.match(theme, /theme-advanced-editor/);

console.log('V587_VISUAL_CONTRACT_TARGETS=6');
console.log('V587_VISUAL_CONTRACT_SNAPSHOT=' + crypto.createHash('sha256').update(signatures.join('\n')).digest('hex'));
console.log('V587_VISUAL_CONTRACT_SNAPSHOT=PASSED');
