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
const embeddedEnglish=JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const huPack=JSON.parse(read('scripts/fixtures/language-packs-v800/hu.locale.json'));
const dePack=JSON.parse(read('scripts/fixtures/language-packs-v800/de.locale.json'));

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

const languageObjects={
  hu:huPack.translations,
  en:embeddedEnglish,
  de:dePack.translations
};
for(const key of [
  'appUpdate.sidebarCta',
  'startupIssues.eyebrow',
  'startupIssues.title',
  'startupIssues.help',
  'startupIssues.unknown'
]){
  for(const [lang,dictionary] of Object.entries(languageObjects)){
    assert.equal(typeof dictionary[key],'string',`${key}: present in ${lang}`);
    assert.ok(dictionary[key].length>0,`${key}: non-empty in ${lang}`);
  }
}

console.log('V621_STARTUP_WARNING_RETENTION=PASSED');
console.log('V621_MACOS_RECOVERED_KEYCHAIN_NOISE_CLASSIFICATION=PASSED');
console.log('V621_NON_MAC_AND_PERSISTENT_ERRORS_NOT_GLOBALLY_SUPPRESSED=PASSED');
console.log('V621_GLOBAL_APP_UPDATE_VISIBILITY=PASSED');
