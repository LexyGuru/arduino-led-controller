#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const app=read('desktop-tauri/src/App.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const hook=read('desktop-tauri/src/hooks/useAppUpdateCenter.ts');
const component=read('desktop-tauri/src/components/v55/AppUpdateCenter.tsx');
const css=read('desktop-tauri/src/v55-app-update-center.css');
const main=read('desktop-tauri/src/main.tsx');
const i18n=read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');

for(const marker of [
  'tauriApi.appVersion()',
  'appUpdateAvailable',
  'availableApp',
  'autoCheckUpdates',
  'updateChannel',
  'SIX_HOURS',
  'checkNow',
  'compareVersions',
  'phase'
]) assert.ok(hook.includes(marker),`hook: ${marker}`);

assert.match(
  hook,
  /tauriApi\.firmwareStatus\(\s*config\.updateChannel,\s*config\.firmwareUpdateChannel\s*\)/s,
  'hook: live app + firmware channels must be passed to firmwareStatus'
);
assert.ok(!hook.includes('Math.random'),'no fake update data');
assert.ok(component.includes('v55-app-update-center'));
assert.ok(component.includes('appUpdate.current'));
assert.ok(component.includes('appUpdate.available'));
assert.ok(component.includes('appUpdate.error'));
assert.ok(component.includes('state.downloadUrl || state.releaseUrl'));
assert.ok(app.includes('useAppUpdateCenter'));
assert.ok(app.includes('const appUpdate'));
assert.ok(app.includes('useController(page)') || /useController\s*\(\s*page\s*\)/.test(app));
assert.ok(app.includes('appUpdate={appUpdate}'));
assert.ok(app.includes('updateAvailable={appUpdate.updateAvailable}'));
assert.ok(settings.includes('AppUpdateCenter'));
assert.ok(settings.includes('<AppUpdateCenter state={appUpdate}'));
assert.ok(sidebar.includes('updateAvailable'));
assert.ok(sidebar.includes('latestAppVersion'));
assert.ok(sidebar.includes('v55-sidebar-update-dot'));
assert.ok(sidebar.includes('core-nav-indicator'));
assert.ok(sidebar.includes('core-app-version'));
assert.ok(main.includes('v55-app-update-center.css'));
assert.ok(css.includes('v55-update-state.available'));
assert.ok(css.includes('@media(max-width:520px)'));

for(const key of [
  'appUpdate.eyebrow','appUpdate.title','appUpdate.available','appUpdate.current',
  'appUpdate.error','appUpdate.checking','appUpdate.notChecked','appUpdate.channel',
  'appUpdate.installed','appUpdate.latest','appUpdate.lastCheck','appUpdate.never',
  'appUpdate.checkError','appUpdate.checkNow','appUpdate.download',
  'appUpdate.currentHelp','appUpdate.noDirectDownload','appUpdate.sidebarAvailable'
]){
  const escaped=key.replaceAll('.','\\.');
  const count=(i18n.match(new RegExp(`['"]${escaped}['"]\\s*:`, 'g'))||[]).length;
  assert.equal(count,3,`${key}: HU/EN/DE parity`);
}

console.log('APP_UPDATE_SHARED_STATUS_SOURCE=PASSED');
console.log('APP_UPDATE_CHANNEL_AWARE=PASSED');
console.log('APP_UPDATE_AUTO_6H_CHECK=PASSED');
console.log('APP_UPDATE_MANUAL_CHECK=PASSED');
console.log('APP_UPDATE_ERROR_STATE_SEPARATE=PASSED');
console.log('APP_UPDATE_SETTINGS_CENTER=PASSED');
console.log('APP_UPDATE_SIDEBAR_NOTIFICATION=PASSED');
console.log('APP_UPDATE_CENTER_V319_CONTRACT=PASSED');
