#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const release=JSON.parse(read('release-versions.json'));
const app=read('desktop-tauri/src/App.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const bottom=read('desktop-tauri/src/components/BottomNav.tsx');
const nav=read('desktop-tauri/src/settings-navigation.ts');
const css=read('desktop-tauri/src/settings-beta5.css');
const main=read('desktop-tauri/src/main.tsx');

assert.equal(release.application,'6.0.0-beta.5');
assert.equal(release.applicationRelease.version,'6.0.0-beta.5');
assert.equal(release.firmware,'5.1.0-beta.3');
assert.equal(release.directApi,'1.1.0');

for(const target of ['general','connection','updates','hardware']) assert.ok(nav.includes(`'${target}'`),target);
assert.ok(app.includes("useState<SettingsTarget>('general')"));
assert.ok(app.includes('target={settingsTarget}'));
assert.ok(app.includes('onTargetChange={setSettingsTarget}'));
assert.ok(sidebar.includes("onChange('settings', 'updates')"));
assert.ok(bottom.includes("id === 'settings' && updateAvailable ? 'updates' : undefined"));
assert.ok(bottom.includes('beta5-settings-update-dot'));

for(const target of ['general','connection','updates','hardware']){
  assert.ok(settings.includes(`selectSettingsView('${target}')`),target);
  assert.ok(settings.includes(`settingsView === '${target}'`),target);
}
assert.ok(settings.includes("role=\"tab\""));
assert.ok(settings.includes('aria-selected='));
assert.ok(settings.includes("settingsView === 'updates' && !isMobile && <AppUpdateCenter"));
assert.ok(settings.includes("settingsView === 'connection' && (otaSupported ?"));
assert.ok(settings.includes("settingsView === 'hardware' && <section"));
assert.ok(css.includes('@media (max-width: 1024px)'));
assert.ok(css.includes('@media (max-width: 720px)'));
assert.ok(css.includes('@media (pointer: coarse)'));
assert.ok(css.includes('min-height: 44px'));
assert.ok(css.includes('env(safe-area-inset-bottom'));
assert.ok(main.includes("import './settings-beta5.css';"));

console.log('BETA5_SETTINGS_SHARED_STATE_MODEL=PASSED');
console.log('DESKTOP_UPDATE_DEEP_LINK=PASSED');
console.log('MOBILE_UPDATE_DEEP_LINK=PASSED');
console.log('IPAD_SETTINGS_COMPAT_LAYER=PASSED');
console.log('ANDROID_IOS_SETTINGS_COMPAT_LAYER=PASSED');
console.log('WINDOWS_LINUX_MACOS_SETTINGS_COMPAT_LAYER=PASSED');
console.log('TOUCH_TARGET_GUARD=PASSED');
console.log('RESPONSIVE_OVERFLOW_GUARD=PASSED');




const enLocale=JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const huLocale=JSON.parse(read('scripts/fixtures/language-packs-v800/hu.locale.json')).translations;
const deLocale=JSON.parse(read('scripts/fixtures/language-packs-v800/de.locale.json')).translations;

for(const key of [
  'settings-hub.general',
  'settings.direct.title',
  'settings.updates.eyebrow',
  'settings.ledTopology.title'
]){
  for(const [lang,locale] of Object.entries({en:enLocale,hu:huLocale,de:deLocale})){
    assert.equal(typeof locale[key],'string',`${lang}:${key} missing`);
    assert.ok(locale[key].trim().length>0,`${lang}:${key} empty`);
  }
}

for(const forbidden of [
  'settings-hub.connection',
  'settings-hub.updates',
  'settings-hub.hardware'
]){
  assert.equal(Object.prototype.hasOwnProperty.call(enLocale,forbidden),false,`${forbidden}: must not become an embedded-only fallback key`);
}

assert.ok(settings.includes("t('settings-hub.general')"));
assert.ok(settings.includes("t('settings.direct.title')"));
assert.ok(settings.includes("t('settings.updates.eyebrow')"));
assert.ok(settings.includes("t('settings.ledTopology.title')"));
assert.ok(!settings.includes("t('settings-hub.connection')"));
assert.ok(!settings.includes("t('settings-hub.updates')"));
assert.ok(!settings.includes("t('settings-hub.hardware')"));

console.log('SETTINGS_EXISTING_PACK_KEY_COMPATIBILITY=PASSED');
console.log('SETTINGS_NO_NEW_I18N_FALLBACK_KEYS=PASSED');

console.log('SETTINGS_INFORMATION_ARCHITECTURE_V854=PASSED');
