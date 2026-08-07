#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const i18n = fs.readFileSync('desktop-tauri/src/i18n/index.tsx', 'utf8');
const topbar = fs.readFileSync('desktop-tauri/src/components/Topbar.tsx', 'utf8');

assert(!/['"]topbar\.eyebrow['"]\s*:/.test(i18n), 'topbar.eyebrow key remains');
assert(!i18n.includes('2026_MAX_LED'), 'legacy 2026_MAX_LED branding remains');
assert(!topbar.includes("t('topbar.eyebrow')"), 'Topbar still uses legacy eyebrow');
assert(topbar.includes('Arduino LED Controller V5'), 'V5 title missing');
assert(topbar.includes('Direct Arduino Control & Automation'), 'V5 tagline missing');

console.log('TOPBAR_EYEBROW_KEYS=ZERO');
console.log('LEGACY_2026_MAX_LED_I18N=ZERO');
console.log('V5_TOPBAR_IDENTITY=PRESERVED');
console.log('BETA8_I18N_EYEBROW_CLEANUP=PASSED');
