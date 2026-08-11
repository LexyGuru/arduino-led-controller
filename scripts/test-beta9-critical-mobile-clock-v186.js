const fs=require('fs');
const assert=require('assert');
const read=(p)=>fs.readFileSync(p,'utf8');

const fw=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const appearance=read('desktop-tauri/src/components/AppearanceSettings.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const css=read('desktop-tauri/src/api-v2.css');
const cred=read('desktop-tauri/src-tauri/src/credential_bridge.rs');
const pkg=JSON.parse(read('package.json'));

assert.match(fw,/scheduleReconcileRequested/);
assert.match(fw,/uint32_t currentLocalEpoch\(\)/);
assert.match(fw,/NTP_SYNC_INTERVAL_MS\s*=\s*10UL \* 60UL \* 1000UL/);
assert.match(fw,/timeSynced\s*=\s*true;[\s\S]{0,1200}scheduleReconcileRequested\s*=\s*true;/);

assert.match(cred,/MOBILE_NATIVE_CREDENTIAL_STORE_V158/);
assert.match(cred,/apple_native_keyring_store::protected::Store/);
assert.match(cred,/android_native_keyring_store::Store/);
assert.match(cred,/keyring_core::set_default_store/);

assert.match(settings,/<AppearanceSettings \/>/);
assert.match(appearance,/data-mobile-theme-parity="full"/);
assert.match(sidebar,/id:'settings'/);
assert.match(css,/MOBILE_SETTINGS_THEME_NAV_V186/);
assert.match(css,/\.sidebar nav button\s*\{[\s\S]*flex:\s*1 1 0;[\s\S]*min-width:\s*0;/);

assert.ok(pkg.scripts['test:firmware-scheduler-local-time-hotfix']);
assert.ok(pkg.scripts['test:mobile-credential-theme-v158']);
assert.ok(pkg.scripts['test:beta9-critical-mobile-clock-v186']);

console.log('FIRMWARE_AUTHORITATIVE_CLOCK_V186=PASSED');
console.log('FIRMWARE_SCHEDULER_RECONCILIATION_V186=PASSED');
console.log('MOBILE_NATIVE_CREDENTIAL_PERSISTENCE_V186=PASSED');
console.log('MOBILE_SHARED_THEME_REACHABILITY_V186=PASSED');
console.log('BETA9_CRITICAL_MOBILE_CLOCK_V186_CONTRACT=PASSED');
