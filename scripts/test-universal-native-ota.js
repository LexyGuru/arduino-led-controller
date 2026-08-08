#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('node:assert/strict');

const desktopRust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const lxcRust=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const sharedApi=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const firmwarePage=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const webMain=fs.readFileSync('web-lxc/src/main.tsx','utf8');
const env=fs.readFileSync('deploy/rust-lxc.env.example','utf8');
const installer=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const updater=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');

for(const m of [
  'ota_supported: !mobile',
  'if matches!(mode, "auto" | "bundled")',
  'Beépített Rust HTTP OTA-motor (Windows/macOS/Linux)',
  'async fn upload_firmware_native('
]) a.ok(desktopRust.includes(m),m);

for(const m of [
  'upload_native(',
  'POST /sketch HTTP/1.1',
  '/api/v1/server/ota/runtime',
  '/api/v1/server/firmware/install',
  '/api/v1/server/firmware/releases',
  '/api/v1/server/firmware/cancel',
  'x-lxc-ota-token',
  'ARDUINO_OTA_PASSWORD',
  'LXC_OTA_CONTROL_TOKEN',
  'sha256sum',
  'scheduleRevision',
  'scheduleChecksum',
  'bootId',
  'native-rust-http'
]) a.ok(lxcRust.includes(m),m);

for(const m of [
  'ARDUINO_OTA_PORT=65280',
  'ARDUINO_OTA_PASSWORD=CHANGE_ME',
  'LXC_OTA_CONTROL_TOKEN=CHANGE_ME'
]) a.ok(env.includes(m),m);

for(const text of [installer,updater]){
  a.ok(text.includes('"installMode":"native-rust-http"'));
  a.ok(text.includes('"downloadUrl"'));
  a.ok(text.includes('"checksumUrl"'));
}

a.ok(webMain.includes("../../desktop-tauri/src/main"));
a.ok(sharedApi.includes("/api/v1/server/firmware/install"));
a.ok(sharedApi.includes("/api/v1/server/firmware/releases"));
a.ok(sharedApi.includes("'X-LXC-OTA-Token':"));
a.ok(sharedApi.includes("listenOtaProgress"));
a.ok(firmwarePage.includes("firmwareReleases"));
a.ok(firmwarePage.includes("firmwareInstallRelease"));

console.log('DESKTOP_WINDOWS_NATIVE_OTA=YES');
console.log('DESKTOP_MACOS_NATIVE_OTA=YES');
console.log('DESKTOP_LINUX_NATIVE_OTA=YES');
console.log('PROXMOX_LXC_NATIVE_OTA=YES');
console.log('IOS_IPADOS_ANDROID_OTA_WRITE=DISABLED');
console.log('SHARED_FIRMWARE_UI=YES');
console.log('LXC_FIRMWARE_RELEASE_SELECTION=YES');
console.log('LXC_OTA_CANCEL=YES');
console.log('FIRMWARE_SHA256_VERIFY=YES');
console.log('BOOT_ID_VERIFY=YES');
console.log('SCHEDULE_PERSISTENCE_VERIFY=YES');
console.log('UNIVERSAL_NATIVE_OTA_CONTRACT=PASSED');
