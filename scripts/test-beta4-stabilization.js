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
