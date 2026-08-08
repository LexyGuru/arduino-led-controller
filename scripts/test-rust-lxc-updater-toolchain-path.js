#!/usr/bin/env node
'use strict';

const fs=require('fs');
const assert=require('node:assert/strict');

const updater=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');
const installer=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const service=fs.readFileSync('deploy/systemd/arduino-led-controller-update.service','utf8');

for(const marker of [
  'export CARGO_HOME="${CARGO_HOME:-/root/.cargo}"',
  'export RUSTUP_HOME="${RUSTUP_HOME:-/root/.rustup}"',
  'export PATH="${CARGO_HOME}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"',
  'command -v cargo',
  'command -v rustc',
  'log "cargo=$(command -v cargo)"',
  'log "rustc=$(command -v rustc)"'
]){
  assert.ok(updater.includes(marker),`updater marker hiányzik: ${marker}`);
}

for(const marker of [
  'Environment=HOME=/root',
  'Environment=CARGO_HOME=/root/.cargo',
  'Environment=RUSTUP_HOME=/root/.rustup',
  'Environment=PATH=/root/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
]){
  assert.ok(service.includes(marker),`service marker hiányzik: ${marker}`);
}

for(const marker of [
  'export CARGO_HOME="${CARGO_HOME:-/root/.cargo}"',
  'export RUSTUP_HOME="${RUSTUP_HOME:-/root/.rustup}"',
  'command -v cargo',
  'command -v rustc'
]){
  assert.ok(installer.includes(marker),`installer marker hiányzik: ${marker}`);
}

console.log('RUSTUP_ROOT_TOOLCHAIN=YES');
console.log('SYSTEMD_CARGO_PATH=YES');
console.log('UPDATER_CARGO_PREFLIGHT=YES');
console.log('UPDATER_RUSTC_PREFLIGHT=YES');
console.log('NATIVE_INSTALLER_TOOLCHAIN_ENV=YES');
console.log('LXC_UPDATER_TOOLCHAIN_PATH_CONTRACT=PASSED');
