#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const roots = ['desktop-tauri/src', 'README.md'];
let files = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const st = fs.statSync(root);
  files = files.concat(st.isDirectory() ? walk(root) : [root]);
}

const textFiles = files.filter(f => /\.(tsx?|jsx?|css|md|html|json)$/i.test(f) || f === 'README.md');
const forbidden = [
  '2026_MAX_LED VEZÉRLŐRENDSZER',
  '2026 MAX LED VEZÉRLŐRENDSZER',
  '2026_MAX_LED',
];

const hits = [];
for (const file of textFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of forbidden) {
    if (text.includes(needle)) hits.push(`${file}: ${needle}`);
  }
}

assert(hits.length === 0, `legacy user-facing branding remains:\n${hits.join('\n')}`);

const sidebar = fs.readFileSync('desktop-tauri/src/components/Sidebar.tsx', 'utf8');
assert(
  sidebar.includes('Arduino LED Controller V5') ||
  sidebar.includes('Közvetlen Arduino-vezérlés és automatizálás') ||
  fs.readFileSync('README.md', 'utf8').includes('Közvetlen Arduino-vezérlés és automatizálás'),
  'new V5 branding/subtitle not found in expected UI/docs'
);

console.log('LEGACY_2026_MAX_LED_BRANDING=REMOVED');
console.log('V5_PRIMARY_NAME=PRESENT');
console.log('V5_SUBTITLE=PRESENT');
console.log('LEGACY_BRANDING_CLEANUP_CONTRACT=PASSED');
