#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const app=read('desktop-tauri/src/App.tsx');
const hook=read('desktop-tauri/src/hooks/useAppUpdateCenter.ts');
const controller=read('desktop-tauri/src/hooks/useController.ts');
const page=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const panel=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const api=read('desktop-tauri/src/services/tauriApi.ts');
const rust=read('desktop-tauri/src-tauri/src/lib.rs');
const startup=read('desktop-tauri/src/hooks/useAppStartupGate.ts');

assert.match(app,/firmwareUpdateChannel:\s*controller\.config\.firmwareUpdateChannel/);
assert.match(app,/firmwareUpdateChannel=\{controller\.config\.firmwareUpdateChannel\}/);

assert.match(hook,/firmwareUpdateChannel.*autoCheckUpdates/);
assert.match(hook,/tauriApi\.firmwareStatus\(\s*config\.updateChannel,\s*config\.firmwareUpdateChannel/s);

assert.match(controller,/tauriApi\.firmwareStatus\(\s*config\.updateChannel,\s*config\.firmwareUpdateChannel/s);

assert.match(page,/firmwareUpdateChannel: 'stable' \| 'beta'/);
assert.match(page,/const selectedFirmwareChannel = firmwareUpdateChannel/);
assert.match(page,/firmwareReleases\(selectedFirmwareChannel\)/);
assert.match(page,/firmwareInstallRelease\(tag, selectedFirmwareChannel\)/);
assert.match(page,/channel: selectedFirmwareChannel === 'stable' \? 'Stable' : 'Beta'/);
assert.doesNotMatch(page,/restoreVersions[\s\S]{0,150}firmware\?\.firmwareUpdateChannel/);

assert.match(panel,/firmwareUpdateChannel: 'stable' \| 'beta'/);
assert.match(panel,/const firmwareSelectedChannel = firmwareUpdateChannel/);
assert.match(panel,/firmwareSelectedChannel\.toUpperCase\(\)/);

assert.match(api,/firmwareReleases:\(channel\?:'stable'\|'beta'\)/);
assert.match(api,/invoke\('firmware_releases',\{channel\}\)/);
assert.match(api,/firmwareStatus:\(updateChannel\?:'stable'\|'beta',firmwareUpdateChannel\?:'stable'\|'beta'\)/);
assert.match(api,/invoke\('firmware_status',\{updateChannel,firmwareUpdateChannel\}\)/);
assert.match(api,/firmwareInstallRelease:\(tag:string,channel\?:'stable'\|'beta'\)/);

assert.match(rust,/async fn firmware_status\([\s\S]*update_channel: Option<String>,[\s\S]*firmware_update_channel: Option<String>/);
assert.match(rust,/async fn firmware_releases\([\s\S]*channel: Option<String>/);
assert.match(rust,/async fn firmware_install_release\([\s\S]*channel: Option<String>/);
assert.match(rust,/firmware_artifacts_from_release_channel\(release, normalized_channel\)/);

assert.match(startup,/check\.state === 'pending'\s*\?\s*\{ \.\.\.check, state: 'pass', detailKey: 'startup\.detail\.backgroundContinue' \}/);
assert.doesNotMatch(startup,/connectionHealth\.state === 'healthy' \? 'pass' : 'warn'/);

console.log('V619_LIVE_APP_CHANNEL_PIPELINE=PASSED');
console.log('V619_LIVE_FIRMWARE_CHANNEL_PIPELINE=PASSED');
console.log('V619_STABLE_BETA_CATALOG_UI_ISOLATION=PASSED');
console.log('V619_CHANNEL_AWARE_INSTALL_PREFLIGHT=PASSED');
console.log('V619_LOADING_SOFT_BACKGROUND_NO_WARNING=PASSED');
