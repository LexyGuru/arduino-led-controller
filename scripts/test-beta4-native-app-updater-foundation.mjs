#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const json=(p)=>JSON.parse(read(p));
const PUBLIC='dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDE5M0ZGNEMxMjNDQkEyMDAKUldRQW9zc2p3ZlEvR2QxT0ViRE93ejhLb3JCR0tqVVF0M0JLQStyZVlXdm9pSllJNndDaUorWVQK';
const ENDPOINT='https://github.com/LexyGuru/arduino-led-controller/releases/download/updater-beta/latest.json';

assert.equal(read('VERSION').trim(),'5.5.1-beta.4');

const cargo=read('desktop-tauri/src-tauri/Cargo.toml');
assert.match(cargo,/\[target\.'cfg\(any\(target_os = "macos", target_os = "windows", target_os = "linux"\)\)'\.dependencies\][\s\S]*tauri-plugin-updater\s*=\s*"2"/);

const tauri=json('desktop-tauri/src-tauri/tauri.conf.json');
assert.equal(tauri.bundle?.createUpdaterArtifacts,true);
assert.equal(tauri.plugins?.updater?.pubkey,PUBLIC);
assert.deepEqual(tauri.plugins?.updater?.endpoints,[ENDPOINT]);
assert.equal(tauri.plugins?.updater?.windows?.installMode,'passive');

const rust=read('desktop-tauri/src-tauri/src/lib.rs');
for(const marker of [
  'tauri_plugin_updater::Builder::new().build()',
  'tauri_plugin_updater::UpdaterExt',
  'async fn app_update_check(',
  'async fn app_update_install(',
  '.download_and_install(',
  'app.restart()',
  'app_update_check,',
  'app_update_install,'
]) assert.ok(rust.includes(marker),marker);

const types=read('desktop-tauri/src/types/index.ts');
assert.ok(types.includes('export interface NativeAppUpdateInfo'));
assert.ok(types.includes('version: string'));

const api=read('desktop-tauri/src/services/tauriApi.ts');
assert.ok(api.includes("invoke('app_update_check')"));
assert.ok(api.includes("invoke('app_update_install')"));

const hook=read('desktop-tauri/src/hooks/useAppUpdateCenter.ts');
for(const marker of [
  "'installing'",
  'nativeInstallAvailable',
  'tauriApi.appUpdateCheck()',
  'tauriApi.appUpdateInstall()',
  "config.updateChannel === 'beta'",
  'installNow'
]) assert.ok(hook.includes(marker),marker);

const component=read('desktop-tauri/src/components/v55/AppUpdateCenter.tsx');
assert.ok(component.includes('state.installNow()'));
assert.ok(component.includes('state.nativeInstallAvailable'));
assert.ok(component.includes('state.downloadUrl || state.releaseUrl'));

const i18n=read('desktop-tauri/src/i18n/runtime.ts');
for(const key of ['appUpdate.install','appUpdate.installing','appUpdate.nativeVerified']){
  const escaped=key.replaceAll('.','\\.');
  const count=(i18n.match(new RegExp(`['"]${escaped}['"]\\s*:`, 'g'))||[]).length;
  assert.equal(count,3,`${key}: HU/EN/DE parity`);
}

const workflow=read('.github/workflows/beta-release.yml');
for(const marker of [
  'TAURI_SIGNING_PRIVATE_KEY',
  'TAURI_SIGNING_PRIVATE_KEY_PASSWORD',
  'Verify Tauri updater signing secrets',
  'Generate Tauri updater static feed',
  'Arduino_LED_Controller_${VERSION}_Linux_x86_64.AppImage.sig',
  'Arduino_LED_Controller_${VERSION}_Windows_x86_64_Setup.exe.sig',
  'Arduino_LED_Controller_${VERSION}_macOS_Apple_Silicon.app.tar.gz',
  'Arduino_LED_Controller_${VERSION}_macOS_Intel.app.tar.gz',
  'darwin-aarch64',
  'darwin-x86_64',
  'linux-x86_64',
  'windows-x86_64',
  'Publish beta updater feed alias',
  'updater-beta',
  'latest.json'
]) assert.ok(workflow.includes(marker),marker);

const beta3=read('scripts/test-beta3-native-hardening-source-contract.mjs');
assert.ok(beta3.includes('tauri-plugin-updater'));
assert.ok(beta3.includes('BETA4_NATIVE_APP_UPDATER_FOUNDATION=PASSED'));
assert.ok(!beta3.includes('BETA3_NATIVE_APP_UPDATER_INSTALL=DEFERRED'));

console.log('BETA4_NATIVE_UPDATER_RUST_PLUGIN=PASSED');
console.log('BETA4_NATIVE_UPDATER_PUBLIC_KEY=PASSED');
console.log('BETA4_NATIVE_UPDATER_STATIC_FEED=PASSED');
console.log('BETA4_NATIVE_UPDATER_UI_INSTALL_PATH=PASSED');
console.log('BETA4_NATIVE_UPDATER_EXTERNAL_FALLBACK=PRESERVED');
console.log('BETA4_NATIVE_UPDATER_SIGNED_WORKFLOW=PASSED');
console.log('BETA4_NATIVE_APP_SELF_UPDATER_FOUNDATION=PASSED');
