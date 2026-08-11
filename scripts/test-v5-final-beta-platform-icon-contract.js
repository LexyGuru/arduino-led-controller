const fs=require('fs'),assert=require('assert');

const pkg=require('../desktop-tauri/package.json');
assert.match(pkg.version,/beta/i);

for(const f of [
  'branding/v5-neon-panel/variants/v5-stable-dark-master.png',
  'branding/v5-neon-panel/variants/v5-stable-light-master.png',
  'branding/v5-neon-panel/variants/v5-beta-dark-master.png',
  'branding/v5-neon-panel/variants/v5-beta-light-master.png',
  'desktop-tauri/src-tauri/icons/32x32.png',
  'desktop-tauri/src-tauri/icons/128x128.png',
  'desktop-tauri/src-tauri/icons/128x128@2x.png',
  'desktop-tauri/src-tauri/icons/icon.png',
  'desktop-tauri/src-tauri/icons/icon.icns',
  'desktop-tauri/src-tauri/icons/icon.ico'
]){
  assert.ok(fs.existsSync(f),`missing ${f}`);
  assert.ok(fs.statSync(f).size>0,`empty ${f}`);
}

const readme=fs.readFileSync(
  'branding/v5-neon-panel/variants/README.md','utf8'
);

assert.match(readme,/four canonical icon masters/i);
assert.match(readme,/Beta visibility/i);
assert.match(readme,/transparent outer canvas/i);
assert.match(readme,/local wall-clock time/i);
assert.match(readme,/07:00/);
assert.match(readme,/19:00/);
assert.match(readme,/AppKit/i);

console.log('V5_FINAL_BETA_PLATFORM_ICON_CONTRACT=PASSED');
