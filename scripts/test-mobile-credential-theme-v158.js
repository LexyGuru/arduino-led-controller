const fs=require('fs');
const assert=require('assert');
const read=(p)=>fs.readFileSync(p,'utf8');

const cargo=read('desktop-tauri/src-tauri/Cargo.toml');
const cred=read('desktop-tauri/src-tauri/src/credential_bridge.rs');
const lib=read('desktop-tauri/src-tauri/src/lib.rs');
const hook=read('desktop-tauri/src/hooks/useController.ts');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const main=read('desktop-tauri/src/main.tsx');
const appearance=read('desktop-tauri/src/components/AppearanceSettings.tsx');
const provider=read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const storage=read('desktop-tauri/src/design-system/theme-storage.ts');

assert.match(cargo,/target_os = "ios"[\s\S]*keyring-core = "=1\.0\.0"[\s\S]*apple-native-keyring-store/);
assert.match(cargo,/target_os = "android"[\s\S]*keyring-core = "=1\.0\.0"[\s\S]*android-native-keyring-store/);

assert.match(cred,/MOBILE_NATIVE_CREDENTIAL_STORE_V158/);
assert.match(cred,/target_os = "ios"/);
assert.match(cred,/target_os = "android"/);
assert.match(cred,/apple_native_keyring_store::protected::Store/);
assert.match(cred,/android_native_keyring_store::Store/);
assert.match(cred,/keyring_core::set_default_store/);
assert.match(cred,/ensure_platform_store\(\)\?/);

assert.match(lib,/migrate_native_credentials/);
assert.match(lib,/get_profile_secret\(profile_account\(&config, "device-key"\)\)/);
assert.match(lib,/set_profile_secret\([\s\S]*profile_account\(&config, "device-key"\)/);
assert.match(hook,/migrateNativeCredentials\(\)/);
assert.match(hook,/loadConfig\(\)/);

assert.match(settings,/<AppearanceSettings \/>/);
assert.match(main,/<ThemeProvider>/);
assert.match(appearance,/data-mobile-theme-parity="full"/);
for (const token of [
  'appearance.mode','appearance.theme','appearance.accent','appearance.density',
  'appearance.radius','appearance.animations','appearance.glass'
]) assert.ok(appearance.includes(token), `missing ${token}`);
assert.match(provider,/loadAppearance/);
assert.match(provider,/saveAppearance/);
assert.match(storage,/globalThis\.localStorage/);
assert.match(storage,/arduino-led-controller\.appearance\.v1/);

console.log('MOBILE_CREDENTIAL_IOS_PROTECTED_STORE=PASSED');
console.log('MOBILE_CREDENTIAL_ANDROID_KEYSTORE=PASSED');
console.log('MOBILE_CREDENTIAL_STARTUP_RESTORE=PASSED');
console.log('MOBILE_THEME_FULL_SHARED_UI=PASSED');
console.log('MOBILE_THEME_PERSISTENCE=PASSED');
console.log('MOBILE_CREDENTIAL_THEME_V158_CONTRACT=PASSED');


// MOBILE_THEME_NAV_REACHABILITY_V186
{
  const css=read('desktop-tauri/src/api-v2.css');
  const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
  assert.match(sidebar,/id:'settings'/);
  assert.match(settings,/<AppearanceSettings \/>/);
  assert.match(css,/MOBILE_SETTINGS_THEME_NAV_V186/);
  assert.match(css,/\.sidebar nav button\s*\{[\s\S]*flex:\s*1 1 0;[\s\S]*min-width:\s*0;/);
  assert.doesNotMatch(
    appearance,
    /\b(?:hidden|display:\s*none)\b[\s\S]{0,120}data-mobile-theme-parity/,
    'A mobil AppearanceSettings nem rejthető el'
  );
  console.log('MOBILE_THEME_NAV_REACHABILITY_V186=PASSED');
}
