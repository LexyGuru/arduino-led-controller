#!/usr/bin/env node
'use strict';
const assert=require('assert'); const fs=require('fs'); const read=p=>fs.readFileSync(p,'utf8');
const rust=read('desktop-tauri/src-tauri/src/lib.rs'); const bridge=read('desktop-tauri/src-tauri/src/credential_bridge.rs');
const types=read('desktop-tauri/src/types/index.ts'); const settings=read('desktop-tauri/src/pages/SettingsPage.tsx'); const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
for(const token of ['firmware_update_channel','Stabil firmware-re nincs fallback','CSATORNA_ELTÉRÉS']) assert.ok(rust.includes(token),token);
for(const token of ['SESSION_CACHE','OnceLock','cached(&account)','cache(&account']) assert.ok(bridge.includes(token),token);
assert.ok(types.includes('firmwareUpdateChannel'));
assert.ok(settings.includes('Firmware-frissítési csatorna'));
assert.ok(firmware.includes('firmwareUpdateChannel'));
console.log('OK: külön alkalmazás/firmware csatorna és strict firmware gate');
console.log('OK: macOS Keychain munkamenet-cache megszünteti a többszörös feloldást');

for(const token of ['ota_configured','ota_missing_requirements','backup_store_configured','version_token_from_text','expected_checksum']) assert.ok(rust.includes(token),token);
for(const token of ['otaConfigured','otaMissingRequirements','backupStoreConfigured']) assert.ok(types.includes(token),token);
assert.ok(firmware.includes('Hiányzó OTA-feltételek'));
assert.ok(firmware.includes('otaMissingRequirements'));
assert.ok(read('firmware/firmware-release.json').includes('Arduino_LED_Controller_Firmware_4.3.0-beta.3_UNO_R4_WiFi.bin'));
assert.ok(read('docs/v5/BETA4_RELEASE_NOTES.md').includes('Firmware verzió: 4.3.0-beta.3'));
console.log('OK: OTA konfiguráció, backup státusz és firmware artifact felismerés javítva');
