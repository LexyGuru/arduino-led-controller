const fs=require('fs'),assert=require('assert');

const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const api=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const page=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const settings=fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx','utf8');
const i18n=fs.readFileSync('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt','utf8');

assert.match(rust,/async fn firmware_install_external_inner\(/);
assert.match(rust,/async fn firmware_install_external\(/);
assert.match(rust,/firmware_install_external,/);
assert.match(rust,/Kizárólag \.bin firmware-fájl/);
assert.match(rust,/2 \* 1024 \* 1024/);
assert.match(rust,/Sha256::digest\(&firmware\)/);
assert.match(rust,/upload_firmware_native\(/);
assert.match(rust,/upload_firmware_in_terminal\(/);
assert.match(rust,/confirm_restart\(app, state, None\)/);
assert.match(rust,/schedule_revision_before != schedule_revision_after/);
assert.match(rust,/boot_id_before\.is_some\(\) && !boot_id_changed/);

assert.match(api,/firmwareInstallExternal:/);
assert.match(api,/invoke\('firmware_install_external'/);

assert.match(page,/externalFirmwareInputRef/);
assert.match(page,/type="file"/);
assert.match(page,/accept="\.bin,application\/octet-stream"/);
assert.match(page,/file\.arrayBuffer\(\)/);
assert.match(page,/firmwareInstallExternal\(file\.name, bytes\)/);

assert.match(settings,/isMobile=platform==='android'\|\|platform==='ios'/);

for(const key of [
  'firmware.externalTitle',
  'firmware.externalHelp',
  'firmware.externalChoose',
  'firmware.externalConfirm'
]){
  const escaped=key.replace(/\./g,'\\.');
  const count=(i18n.match(new RegExp(`"${escaped}":`,'g'))||[]).length;
  assert.ok(count>=3,`${key} count=${count}`);
}

console.log('V5_FINAL_EXTERNAL_BIN_CONTRACT=PASSED');
