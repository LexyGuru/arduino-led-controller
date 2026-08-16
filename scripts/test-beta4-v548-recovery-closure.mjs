#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');

const v546=read('scripts/test-beta4-update-system-v2-core-ui-v20-theme25.mjs');
const current=read('scripts/test-v55-current-release-contract-v334.js');
const otaUx=read('scripts/test-beta3-ota2-ux-ui-binding.mjs');
const rootNotes=read('RELEASE_NOTES_5.5.1-beta.4.md');
const docsNotes=read('docs/v5/V55_BETA4_RELEASE_NOTES.md');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const theme=read('desktop-tauri/src/design-system/theme-types.ts');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const panel=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const model=read('desktop-tauri/src/utils/updateCenterPanelModel.mjs');

assert.doesNotMatch(v546,/i18n current identity missing: Core UI 2\.0/);
assert.match(v546,/Theme Engine 2\.5/);

assert.match(current,/Theme Engine 2\\\.5/);
assert.match(current,/Update System 2\\\.0/);
assert.doesNotMatch(current,/Theme Engine 2\\\.0/);
assert.doesNotMatch(current,/App Update Center 1\\\.0/);

const normalizedOta=otaUx.replace(/\s+/g,'');
assert.ok(
  normalizedOta.includes('"state.busy||ota2Installing||appUpdate.installing"'),
  'OTA2 aggregate busy marker must include native app updater install state'
);
assert.ok(
  normalizedOta.includes('"busy={state.busy||ota2Installing||appUpdate.installing}"'),
  'UpdateCenterPanel busy binding contract must include native app updater install state'
);
assert.ok(!normalizedOta.includes('"state.busy||ota2Installing",'));
assert.ok(!normalizedOta.includes('"busy={state.busy||ota2Installing}",'));

for(const text of [rootNotes,docsNotes]){
  assert.match(text,/Theme Engine 2\.5/);
  assert.match(text,/Update System 2\.0/);
  assert.doesNotMatch(text,/Theme Engine 2\.0/);
  assert.doesNotMatch(text,/App Update Center 1\.0/);
}

assert.match(topbar,/Core UI 2\.0/);
assert.match(sidebar,/UI 2\.0/);
assert.match(theme,/THEME_ENGINE_VERSION = '2\.5'/);
assert.match(theme,/CORE_UI_VERSION = '2\.0'/);
assert.match(settings,/\{!isMobile && <AppUpdateCenter state=\{appUpdate\}\/>\}/);

const normalizedFirmware=firmware.replace(/\s+/g,'');
assert.ok(normalizedFirmware.includes('appUpdate={appUpdate}'));
assert.ok(normalizedFirmware.includes('isMobile={isMobile}'));
assert.ok(normalizedFirmware.includes('busy={state.busy||ota2Installing||appUpdate.installing}'));

assert.match(panel,/UPDATE SYSTEM 2\.0/);
assert.match(panel,/appUpdate\.installNow\(\)/);

const vi=model.indexOf('firmware?.availableApp?.version');
const ti=model.indexOf('firmware?.availableApp?.tag');
assert.ok(vi>=0 && ti>=0 && vi<ti);

console.log('V548_V546_FALSE_I18N_ASSERTION_REMOVED=PASSED');
console.log('V548_CURRENT_RELEASE_CONTRACT_MIGRATED=PASSED');
console.log('V548_OTA2_APP_UPDATE_BUSY_CONTRACT_MIGRATED=PASSED');
console.log('V548_ROOT_DOCS_RELEASE_NOTES_PARITY=PASSED');
console.log('V548_UPDATE_SYSTEM_2_CURRENT_STATE_PRESERVED=PASSED');
console.log('V548_RECOVERY_CONTRACT_CLOSURE=PASSED');
