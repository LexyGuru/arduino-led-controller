const fs=require('fs'),assert=require('assert');

const rust=fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs','utf8'
);
const sidebar=fs.readFileSync(
  'desktop-tauri/src/components/Sidebar.tsx','utf8'
);
const cargo=fs.readFileSync(
  'desktop-tauri/src-tauri/Cargo.toml','utf8'
);
const readme=fs.readFileSync('README.md','utf8');

for(const f of [
  'desktop-tauri/src-tauri/icons/runtime/v5-stable-dark.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-stable-light.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-beta-dark.png',
  'desktop-tauri/src-tauri/icons/runtime/v5-beta-light.png'
]){
  assert.ok(fs.existsSync(f),`missing ${f}`);
  assert.ok(fs.statSync(f).size>0,`empty ${f}`);
}

assert.match(rust,/fn macos_sync_app_icon/);
assert.match(rust,/setApplicationIconImage/);
assert.match(rust,/beta-dark/);
assert.match(rust,/beta-light/);
assert.match(rust,/stable-dark/);
assert.match(rust,/stable-light/);
assert.match(rust,/macos_sync_app_icon,/);
assert.match(
  rust,
  /#\[tauri::command\]\s*\nfn runtime_capabilities\(/
);

assert.match(sidebar,/V5_MACOS_DYNAMIC_ICON_SYNC/);
assert.match(sidebar,/V5_DAY_NIGHT_ICON_POLICY/);
assert.match(sidebar,/new Date\(\)\.getHours\(\)/);
assert.match(
  sidebar,
  /hour >= 7 && hour < 19 \? 'light' : 'dark'/
);
assert.match(sidebar,/window\.setInterval/);
assert.match(sidebar,/60_000/);
assert.match(sidebar,/onThemeChanged/);
assert.match(sidebar,/macos_sync_app_icon/);

// The old window-theme startup selector is intentionally removed.
// Day/night selection must be independent from the app/window UI theme.
assert.doesNotMatch(sidebar,/currentWindow\.theme\(\)/);

assert.match(cargo,/objc2-app-kit/);
assert.match(cargo,/objc2-foundation/);

assert.match(readme,/V5 Platform Icon System/);
assert.match(readme,/07:00/);
assert.match(readme,/18:59/);
assert.match(readme,/19:00/);
assert.match(readme,/06:59/);
assert.match(readme,/AppKit/);

console.log('V5_FINAL_MACOS_DYNAMIC_ICON_CONTRACT=PASSED');
