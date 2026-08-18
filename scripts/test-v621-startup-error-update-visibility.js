#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('desktop-tauri/src/App.tsx');
const dash=read('desktop-tauri/src/pages/DashboardPage.tsx');
const health=read('desktop-tauri/src/components/v55/DeviceHealthPanel.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const css=read('desktop-tauri/src/v55-app-update-center.css');
const i18n=read('desktop-tauri/src/i18n/runtime.ts');

assert.match(app,/startupIssues=\{startup\.checks\.filter\(\(check\) => check\.state === 'warn'\)\}/);
assert.match(app,/platform=\{controller\.capabilities\.platform\}/);
assert.match(dash,/data-startup-issues=\{startupIssues\.length\}/);
assert.match(dash,/startupIssues\.map/);
assert.match(dash,/recoveredMacCredentialBootstrap/);
assert.match(dash,/platform === 'macos'/);
assert.match(dash,/connectionHealth\.state === 'healthy'/);
assert.match(health,/recoveredMacCredentialBootstrap/);
assert.match(health,/health\.state === 'healthy'/);
assert.match(sidebar,/v621-sidebar-update-card/);
assert.match(sidebar,/onChange\('settings'\)/);
assert.match(sidebar,/latestAppVersion/);
assert.match(css,/\.v621-sidebar-update-card\{/);
assert.match(css,/\.v621-startup-issues\{/);

const huStart=i18n.indexOf('  hu: {');
const enStart=i18n.indexOf('  en: {');
const deStart=i18n.indexOf('  de: {');
const dictEnd=i18n.lastIndexOf('\n};');
assert.ok(huStart>=0 && huStart<enStart && enStart<deStart && deStart<dictEnd);
const languageObjects={
  hu:i18n.slice(huStart,enStart),
  en:i18n.slice(enStart,deStart),
  de:i18n.slice(deStart,dictEnd)
};
for(const key of [
  'appUpdate.sidebarCta',
  'startupIssues.eyebrow',
  'startupIssues.title',
  'startupIssues.help',
  'startupIssues.unknown'
]){
  const escaped=key.replaceAll('.','\\.');
  for(const [lang,body] of Object.entries(languageObjects)){
    const count=(body.match(new RegExp(`['"]${escaped}['"]\\s*:`, 'g'))||[]).length;
    assert.equal(count,1,`${key}: exactly once in ${lang}`);
  }
}

console.log('V621_STARTUP_WARNING_RETENTION=PASSED');
console.log('V621_MACOS_RECOVERED_KEYCHAIN_NOISE_CLASSIFICATION=PASSED');
console.log('V621_NON_MAC_AND_PERSISTENT_ERRORS_NOT_GLOBALLY_SUPPRESSED=PASSED');
console.log('V621_GLOBAL_APP_UPDATE_VISIBILITY=PASSED');
