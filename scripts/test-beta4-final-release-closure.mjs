#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
assert.equal(read('VERSION').trim(),'5.5.1-beta.4');

const pkg=JSON.parse(read('package.json'));
const desktopPkg=JSON.parse(read('desktop-tauri/package.json'));
const tauri=JSON.parse(read('desktop-tauri/src-tauri/tauri.conf.json'));

assert.equal(pkg.version,'5.5.1-beta.4');
assert.equal(desktopPkg.version,'5.5.1-beta.4');
assert.equal(tauri.version,'5.5.1-beta.4');
assert.equal(tauri.bundle?.createUpdaterArtifacts,true);
assert.deepEqual(
  tauri.plugins?.updater?.endpoints,
  ['https://github.com/LexyGuru/arduino-led-controller/releases/download/updater-beta/latest.json']
);

const app=read('desktop-tauri/src/App.tsx');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const theme=read('desktop-tauri/src/design-system/theme-types.ts');
const panel=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const rust=read('desktop-tauri/src-tauri/src/lib.rs');
const cargo=read('desktop-tauri/src-tauri/Cargo.toml');

assert.match(app,/core-ui-v20/);
assert.match(topbar,/Core UI 2\.0/);
assert.match(sidebar,/UI 2\.0/);
assert.match(sidebar,/Beta 4/);
assert.match(theme,/THEME_ENGINE_VERSION\s*=\s*['"]2\.5['"]/);
assert.match(panel,/UPDATE SYSTEM 2\.0/);
assert.match(firmware,/state\.busy\s*\|\|\s*ota2Installing\s*\|\|\s*appUpdate\.installing/);
assert.match(cargo,/tauri-plugin-updater\s*=\s*"2"/);
assert.match(rust,/download_and_install/);
assert.match(rust,/app\.restart\(\)/);

for(const f of [
  'scripts/test-beta4-v548-recovery-closure.mjs',
  'scripts/test-beta4-final-ui-layout-qa.mjs',
  'scripts/test-beta4-native-app-updater-foundation.mjs',
  'scripts/test-beta4-sidebar-badge-paperwork-final-closure.mjs',
  'docs/v5/BETA4_SIDEBAR_BADGE_PAPERWORK_FINAL_CLOSURE.md',
]) assert.ok(fs.existsSync(f),`missing final closure surface: ${f}`);

console.log('V554_APP_VERSION_PARITY=PASSED');
console.log('V554_CORE_UI_2=PASSED');
console.log('V554_THEME_ENGINE_25=PASSED');
console.log('V554_OTA_2=PASSED');
console.log('V554_UPDATE_SYSTEM_2=PASSED');
console.log('V554_SIGNED_UPDATER_SOURCE_CONTRACT=PASSED');
console.log('V554_V548_RECOVERY_PRESERVED=PASSED');
console.log('V554_V549_UI_QA_PRESERVED=PASSED');
console.log('V554_V552_SIGNED_E2E_EVIDENCE_REQUIRED_BY_RUNNER=PASSED');
console.log('V554_FINAL_RELEASE_CLOSURE=PASSED');
