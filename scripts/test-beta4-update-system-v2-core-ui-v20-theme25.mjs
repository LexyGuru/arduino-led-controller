#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildUpdateCenterPanelModel } from '../desktop-tauri/src/utils/updateCenterPanelModel.mjs';

const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('desktop-tauri/src/App.tsx');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const theme=read('desktop-tauri/src/design-system/theme-types.ts');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const panel=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const model=read('desktop-tauri/src/utils/updateCenterPanelModel.mjs');
const main=read('desktop-tauri/src/main.tsx');
const i18n=read('desktop-tauri/src/i18n/runtime.ts');

assert.match(app,/className="app-shell core-ui-v15 core-ui-v20 beta4-ui-baseline"/);
assert.match(app,/appUpdate=\{appUpdate\}/);
assert.match(app,/isMobile=\{controller\.capabilities\.mobile\}/);

assert.match(topbar,/Core UI 2\.0/);
assert.doesNotMatch(topbar,/Core UI 1\.5/);
assert.match(sidebar,/core-version-pill">UI 2\.0</);
assert.doesNotMatch(sidebar,/core-version-pill">UI 1\.5</);

assert.match(theme,/THEME_ENGINE_VERSION = '2\.5'/);
assert.match(theme,/CORE_UI_VERSION = '2\.0'/);

assert.match(settings,/\{!isMobile && <AppUpdateCenter state=\{appUpdate\}\/>\}/);

for(const marker of [
  'appUpdate: AppUpdateState',
  'isMobile: boolean',
  'appUpdate.checkNow()',
  'appUpdate={appUpdate}',
  'isMobile={isMobile}',
  'OTA 2.0'
]) assert.ok(firmware.includes(marker),marker);

for(const marker of [
  'UPDATE SYSTEM 2.0',
  'appUpdate.installNow()',
  'appUpdate.nativeInstallAvailable',
  'update-system-install-app',
  'update-system-install-firmware',
  '!isMobile &&',
  'mobile-firmware-only',
  'buildUpdateCenterPanelModel({ firmware })',
  'getUpdateRelation(appAvailable, appInstalled)',
  'readiness.every'
]) assert.ok(panel.includes(marker),marker);

const versionIndex=model.indexOf('firmware?.availableApp?.version');
const tagIndex=model.indexOf('firmware?.availableApp?.tag');
assert.ok(versionIndex>=0 && tagIndex>=0 && versionIndex<tagIndex);

const olderApp=buildUpdateCenterPanelModel({
  application:{installedVersion:'5.5.1-beta.4'},
  firmware:{availableApp:{version:'5.5.1-beta.2',tag:'v5.5.1-beta.2'}}
});
assert.equal(olderApp.application.relation,'older');

assert.match(main,/v551-beta4-update-system-v2-core-ui-v20-theme25\.css/);

assert.ok(
  i18n.includes('Theme Engine 2.5'),
  'i18n current Theme Engine identity missing: Theme Engine 2.5'
);

console.log('CORE_UI_2_0_CURRENT_IDENTITY=PASSED');
console.log('THEME_ENGINE_2_5_CURRENT_IDENTITY=PASSED');
console.log('UPDATE_SYSTEM_2_0_ACTION_SPLIT=PASSED');
console.log('MOBILE_DESKTOP_APP_UPDATE_UI_HIDDEN=PASSED');
console.log('APP_OLDER_RELEASE_RELATION=PASSED');
console.log('OTA_2_0_CURRENT_IDENTITY=PASSED');
console.log('V546_CURRENT_INTEGRATION_CONTRACT=PASSED');
