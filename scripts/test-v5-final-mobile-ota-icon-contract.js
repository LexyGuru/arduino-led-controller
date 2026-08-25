const fs=require('fs'), assert=require('assert');
const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const settings=fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx','utf8');
const i18n=fs.readFileSync('scripts/fixtures/i18n-embedded-en-compat-v800.txt','utf8');

assert.match(rust,/ota_supported:\s*true/);
assert.match(rust,/config\.ota_upload_mode = "auto"\.into\(\)/);
assert.match(settings,/isMobile=platform==='android'\|\|platform==='ios'/);
assert.match(settings,/!isMobile&&<option value="system"/);
assert.doesNotMatch(i18n,/OTA firmware-frissítés letiltva/);
assert.doesNotMatch(i18n,/OTA firmware update disabled/);
assert.doesNotMatch(i18n,/OTA-Firmware-Update deaktiviert/);
assert.ok(fs.existsSync('desktop-tauri/src-tauri/icons/icon.icns'));
assert.ok(fs.existsSync('desktop-tauri/src-tauri/icons/icon.ico'));
console.log('V5_FINAL_MOBILE_OTA_ICON_CONTRACT=PASSED');
