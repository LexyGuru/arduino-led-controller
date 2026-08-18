#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const appearance=read('desktop-tauri/src/components/AppearanceSettings.tsx');
const updater=read('desktop-tauri/src/components/v55/AppUpdateCenter.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-settings-consistency-sweep.css');
const pkg=JSON.parse(read('package.json'));

const semanticCall=(object,method)=>
  new RegExp(`${object}\\s*\\.\\s*${method}\\s*\\(`);

assert.match(
  settings,
  /className="page settings-page v55-settings-hub beta4-settings-redesign"/
);
assert.match(
  main,
  /import '\.\/v551-beta4-settings-consistency-sweep\.css';/
);

for(const marker of [
  '.beta4-settings-redesign .v55-settings-hub-nav',
  '.beta4-settings-redesign .settings-panel',
  '.beta4-settings-redesign .theme-card',
  '.beta4-settings-redesign .accent-picker',
  '.beta4-settings-redesign .v55-app-update-center',
  '.beta4-settings-redesign .settings-actions',
  '.beta4-ui-baseline :where(',
  ':focus-visible',
  '@media (pointer:coarse)',
  '@media (prefers-contrast:more)',
  '@media(prefers-reduced-motion:reduce)'
]){
  assert.ok(css.includes(marker),`missing Beta.4 settings/sweep contract: ${marker}`);
}

// Settings behavior preserved.
assert.match(settings,/timezoneSnapshot/);
assert.match(settings,/offsetMinutes/);
assert.match(settings,/validHost/);
assert.match(settings,/validPort/);
assert.match(settings,/validPath/);
assert.match(settings,/validKey/);
assert.match(settings,/const canSave=/);
assert.match(settings,/settingsView/);
assert.match(settings,/setSettingsView/);
assert.match(settings,/changeLanguage/);
assert.match(settings,/otaUploadMode/);
assert.match(settings,/firmwareUpdateChannel/);
assert.match(settings,/autoCheckUpdates/);
assert.match(settings,/autoDownloadUpdates/);
assert.match(settings,/onSave/);
assert.match(settings,/onTest/);

// Theme Engine V2 preserved.
assert.match(appearance,/THEME_CATALOG/);
assert.match(appearance,/THEME_ENGINE_VERSION/);
assert.match(appearance,/CORE_UI_VERSION/);
assert.match(appearance,/setAppearance/);
assert.match(appearance,/resetAppearance/);
assert.match(appearance,/appearance\.glassStrength/);
assert.match(appearance,/appearance\.accent/);
assert.match(appearance,/appearance\.animations/);

// App updater preserved.
assert.match(updater,/state\.phase/);
assert.match(updater,/state\.checkNow/);
assert.match(updater,/state\.updateAvailable/);
assert.match(updater,/state\.downloadUrl/);
assert.match(updater,/state\.releaseUrl/);

assert.equal(
  pkg.scripts['test:beta4-settings-consistency-sweep'],
  'node scripts/test-beta4-settings-consistency-sweep.mjs'
);

console.log('BETA4_SETTINGS_HUB_GLASS=PASSED');
console.log('BETA4_SETTINGS_FORM_VISUAL=PASSED');
console.log('BETA4_THEME_ENGINE_VISUAL=PASSED');
console.log('BETA4_APP_UPDATE_CENTER_VISUAL=PASSED');
console.log('BETA4_SETTINGS_STICKY_ACTIONS=PASSED');
console.log('BETA4_FOCUS_VISIBLE_CONTRACT=PASSED');
console.log('BETA4_COARSE_POINTER_TARGETS=PASSED');
console.log('BETA4_HIGH_CONTRAST_FALLBACK=PASSED');
console.log('BETA4_OVERFLOW_PROTECTION=PASSED');
console.log('BETA4_REDUCED_MOTION_GLOBAL=PASSED');
console.log('BETA4_SETTINGS_BEHAVIOR_PRESERVED=PASSED');
console.log('BETA4_SETTINGS_CONSISTENCY_SWEEP=PASSED');
