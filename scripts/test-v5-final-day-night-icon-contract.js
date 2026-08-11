const fs=require('fs'),assert=require('assert');

const sidebar=fs.readFileSync(
  'desktop-tauri/src/components/Sidebar.tsx','utf8'
);
const rust=fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs','utf8'
);
const docs=fs.readFileSync(
  'branding/v5-neon-panel/variants/README.md','utf8'
);

assert.match(sidebar,/V5_DAY_NIGHT_ICON_POLICY/);
assert.match(sidebar,/new Date\(\)\.getHours\(\)/);
assert.match(sidebar,/hour >= 7 && hour < 19 \? 'light' : 'dark'/);
assert.match(sidebar,/window\.setInterval/);
assert.match(sidebar,/60_000/);
assert.match(sidebar,/window\.clearInterval/);
assert.match(sidebar,/onThemeChanged/);
assert.doesNotMatch(sidebar,/currentWindow\.theme\(\)/);

assert.match(rust,/fn macos_sync_app_icon/);
assert.match(rust,/setApplicationIconImage/);
assert.match(rust,/beta-light/);
assert.match(rust,/beta-dark/);

assert.match(docs,/local wall-clock time/i);
assert.match(docs,/07:00/);
assert.match(docs,/18:59/);
assert.match(docs,/19:00/);
assert.match(docs,/06:59/);

console.log('V5_FINAL_DAY_NIGHT_ICON_CONTRACT=PASSED');
