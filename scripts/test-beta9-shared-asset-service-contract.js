#!/usr/bin/env node
'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');
const read=(p)=>fs.readFileSync(p,'utf8');
const vite=read('web-lxc/vite.config.ts');
const updater=read('deploy/update-rust-lxc.sh');
const installer=read('deploy/install-rust-lxc-native.sh');
const updateUnit=read('deploy/systemd/arduino-led-controller-update.service');
const rustUnit=read('deploy/systemd/arduino-led-controller-rust.service');

assert.ok(fs.existsSync('desktop-tauri/public/v5-icon.png'),'canonical desktop v5-icon.png missing');
assert.ok(fs.statSync('desktop-tauri/public/v5-icon.png').size>0,'canonical v5-icon.png empty');
assert.ok(vite.includes('publicDir: canonicalPublicDir'),'web-lxc canonical publicDir missing');
for(const [name,text] of [['updater',updater],['installer',installer]]){
  assert.ok(text.includes('SERVICE="arduino-led-controller-rust.service"'),`${name}: canonical Rust service missing`);
  assert.ok(!text.includes('SERVICE="arduino-led-controller.service"'),`${name}: legacy service hardcode present in Rust path`);
  assert.ok(text.includes('v5-icon.png'),`${name}: v5 icon gate missing`);
}
assert.ok(updater.includes('RUNTIME_GATE_V5_ICON='),'updater runtime asset gate missing');
assert.ok(installer.includes('WEB_LXC_V5_ICON_HTTP=SUCCESS'),'installer HTTP asset gate missing');
assert.ok(updateUnit.includes('arduino-led-controller-rust.service'),'update unit dependency mismatch');
assert.ok(rustUnit.includes('/opt/arduino-led-controller/current/bin/arduino-led-lxc-server'),'Rust service ExecStart mismatch');

console.log('CANONICAL_V5_ICON_SOURCE=PASSED');
console.log('WEB_LXC_CANONICAL_PUBLIC_DIR=PASSED');
console.log('LXC_BUILD_ASSET_GATE=PASSED');
console.log('LXC_RELEASE_ASSET_GATE=PASSED');
console.log('LXC_HTTP_ASSET_GATE=PASSED');
console.log('RUST_LXC_SERVICE_CONTRACT=PASSED');
console.log('BETA9_SHARED_ASSET_SERVICE_CONTRACT=PASSED');
