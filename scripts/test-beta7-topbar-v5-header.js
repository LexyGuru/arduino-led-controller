#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const topbar = fs.readFileSync('desktop-tauri/src/components/Topbar.tsx', 'utf8');
const css = fs.readFileSync('desktop-tauri/src/styles.css', 'utf8');

assert(topbar.includes('<h1>Arduino LED Controller V5</h1>'), 'V5 primary title missing');
assert(topbar.includes('className="topbar-tagline"'), 'V5 tagline element missing');
assert(topbar.includes('Direct Arduino Control & Automation'), 'V5 tagline text missing');
assert(!topbar.includes("t('topbar.eyebrow')"), 'legacy topbar eyebrow still present');
assert(topbar.includes('className="status-line"'), 'connection status line missing');
assert(css.includes('.topbar-tagline'), 'topbar tagline CSS missing');

console.log('TOPBAR_V5_TITLE=PASSED');
console.log('TOPBAR_V5_TAGLINE=PASSED');
console.log('TOPBAR_LEGACY_EYEBROW=REMOVED');
console.log('TOPBAR_CONNECTION_STATUS=PRESERVED');
console.log('TOPBAR_V5_HEADER_CONTRACT=PASSED');
