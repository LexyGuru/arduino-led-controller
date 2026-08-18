#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const TARGET='5.5.1-beta.4';
const read=(p)=>fs.readFileSync(p,'utf8');
const json=(p)=>JSON.parse(read(p));

assert.equal(read('VERSION').trim(),TARGET);

const rootPkg=json('package.json');
const rootLock=json('package-lock.json');
const desktopPkg=json('desktop-tauri/package.json');
const desktopLock=json('desktop-tauri/package-lock.json');
const tauri=json('desktop-tauri/src-tauri/tauri.conf.json');

assert.equal(rootPkg.version,TARGET);
assert.equal(rootLock.version,TARGET);
assert.equal(rootLock.packages?.['']?.version,TARGET);
assert.equal(desktopPkg.version,TARGET);
assert.equal(desktopLock.version,TARGET);
assert.equal(desktopLock.packages?.['']?.version,TARGET);
assert.equal(tauri.version,TARGET);

const cargoToml=read('desktop-tauri/src-tauri/Cargo.toml');
assert.match(cargoToml,/^\[package\][\s\S]*?^name = "arduino-led-controller"[\s\S]*?^version = "5\.5\.1-beta\.4"/m);

const cargoLock=read('desktop-tauri/src-tauri/Cargo.lock');
const appBlock=cargoLock.match(/\[\[package\]\]\nname = "arduino-led-controller"\nversion = "([^"]+)"/);
assert.ok(appBlock,'root application Cargo.lock package missing');
assert.equal(appBlock[1],TARGET);

const beta3=read('docs/v5/BETA3_COMPLETE_DEVELOPMENT_CLOSURE.md');
for(const marker of [
  'f9aeac3a2436823bb834f95ae6fe6a89089facf2',
  'release-bookkeeping defect',
  'CHECK',
  'DOWNLOAD',
  'VERIFY',
  'BACKUP',
  'CONNECT',
  'UPLOAD',
  'POST-VERIFY',
  'bounded read retry',
  'no write-stage retry',
  'single-flight',
  'automatic schedule backup',
  'diagnostic secret scrubbing',
  'Beta.4 handoff'
]) assert.ok(beta3.includes(marker),`Beta.3 closure marker missing: ${marker}`);

const beta4=read('docs/v5/BETA4_COMPLETE_UI_REDESIGN_RELEASE_READINESS.md');
for(const marker of [
  'Shell and dashboard',
  'LED controls',
  'Schedules',
  'Firmware / Update Center / OTA2',
  'Logs / Audit / Observability',
  'Settings / Theme Engine',
  'Final consistency and accessibility sweep',
  'Direct API logic',
  'Theme Engine V2',
  TARGET
]) assert.ok(beta4.includes(marker),`Beta.4 readiness marker missing: ${marker}`);

// Verify all visual layers are wired.
const app=read('desktop-tauri/src/App.tsx');
const main=read('desktop-tauri/src/main.tsx');
const pages={
  leds:read('desktop-tauri/src/pages/LedsPage.tsx'),
  schedules:read('desktop-tauri/src/pages/SchedulesPage.tsx'),
  firmware:read('desktop-tauri/src/pages/FirmwarePage.tsx'),
  logs:read('desktop-tauri/src/pages/LogsPage.tsx'),
  settings:read('desktop-tauri/src/pages/SettingsPage.tsx')
};
assert.match(app,/beta4-ui-baseline/);
assert.match(pages.leds,/beta4-leds-page/);
assert.match(pages.schedules,/beta4-schedules-redesign/);
assert.match(pages.firmware,/beta4-firmware-redesign/);
assert.match(pages.logs,/beta4-logs-redesign/);
assert.match(pages.settings,/beta4-settings-redesign/);

for(const importName of [
  'v551-beta4-ui-baseline.css',
  'v551-beta4-shell-dashboard-redesign.css',
  'v551-beta4-led-schedules-redesign.css',
  'v551-beta4-firmware-update-center-redesign.css',
  'v551-beta4-logs-audit-redesign.css',
  'v551-beta4-settings-consistency-sweep.css'
]) assert.ok(main.includes(importName),`Beta.4 CSS import missing: ${importName}`);

assert.equal(
  rootPkg.scripts['test:beta34-release-readiness'],
  'node scripts/test-beta34-release-readiness.mjs'
);
assert.equal(
  rootPkg.scripts['test:beta4-current-identity-residue'],
  'node scripts/test-beta4-current-identity-residue.mjs'
);


const rv=json('release-versions.json');
assert.equal(rv.application,TARGET);
assert.equal(rv.firmware,'5.0.0-beta.9');
assert.equal(rv.directApi,'1.0.0');

const webPkg=json('web-lxc/package.json');
const webLock=json('web-lxc/package-lock.json');
assert.equal(webPkg.version,TARGET);
assert.equal(webLock.version,TARGET);
assert.equal(webLock.packages?.['']?.version,TARGET);

assert.equal(json('docs/api/openapi-v2.json').info.version,TARGET);
assert.match(read('desktop-tauri/src/services/tauriApi.ts'),/APP_VERSION\s*=\s*['"]5\.5\.1-beta\.4['"]/);
assert.match(read('.github/workflows/beta-release.yml'),/EXPECTED_VERSION:\s*5\.5\.1-beta\.4/);
assert.ok(read('README.md').includes('| Alkalmazás | **`5.5.1-beta.4`** |'));

for(const p of [
  'RELEASE_NOTES_5.5.1-beta.4.md',
  'docs/v5/V55_BETA4_RELEASE_NOTES.md',
  'docs/v5/V55_BETA4_INSTALLATION_GUIDE.md',
  'docs/v5/V55_BETA4_RELEASE_CHECKLIST.md'
]) assert.ok(fs.existsSync(p),`missing Beta.4 release document: ${p}`);

console.log('BETA4_COMPLETE_RELEASE_SURFACES=PASSED');
console.log('BETA3_HISTORICAL_CLOSURE=PASSED');
console.log('BETA4_VERSION_IDENTITY=5.5.1-beta.4');
console.log('BETA4_ROOT_NPM_VERSION_PARITY=PASSED');
console.log('BETA4_DESKTOP_NPM_VERSION_PARITY=PASSED');
console.log('BETA4_TAURI_VERSION_PARITY=PASSED');
console.log('BETA4_CARGO_VERSION_PARITY=PASSED');
console.log('BETA4_COMPLETE_REDESIGN_DOCUMENTATION=PASSED');
console.log('BETA4_VISUAL_LAYER_WIRING=PASSED');
console.log('BETA34_RELEASE_READINESS=PASSED');
