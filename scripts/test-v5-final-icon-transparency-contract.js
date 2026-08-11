const fs=require('fs'),assert=require('assert');

for(const f of [
  'branding/v5-neon-panel/variants/v5-stable-dark-master.png',
  'branding/v5-neon-panel/variants/v5-stable-light-master.png',
  'branding/v5-neon-panel/variants/v5-beta-dark-master.png',
  'branding/v5-neon-panel/variants/v5-beta-light-master.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-stable-dark.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-stable-light.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-beta-dark.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-beta-light.png'
]){
  assert.ok(fs.existsSync(f),`missing ${f}`);
  assert.ok(fs.statSync(f).size>0,`empty ${f}`);
}

const docs=fs.readFileSync(
  'branding/v5-neon-panel/variants/README.md','utf8'
);
assert.match(docs,/transparent outer canvas/i);
assert.match(docs,/without introducing a white square/i);

const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
assert.match(rust,/beta-light/);
assert.match(rust,/beta-dark/);
assert.match(rust,/stable-light/);
assert.match(rust,/stable-dark/);
assert.match(rust,/setApplicationIconImage/);

console.log('V5_FINAL_ICON_TRANSPARENCY_CONTRACT=PASSED');
