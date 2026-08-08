#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const a=require('node:assert/strict');

const b=fs.readFileSync(
  'deploy/build-rust-lxc-runtime-test-bundle.sh',
  'utf8'
);

for(const marker of [
  'mkdir -p "$STAGE/deploy/systemd" "$STAGE/deploy/proxmox" "$STAGE/docs"',
  'cp "${ROOT}/deploy/proxmox/install-proxmox-lxc.sh" "$STAGE/deploy/proxmox/"',
  'cp "${ROOT}/deploy/update-rust-lxc.sh" "$STAGE/deploy/"',
  'cp "${ROOT}/deploy/systemd/arduino-led-controller-update.timer"',
  'cp -R "${ROOT}/web-lxc" "$STAGE/web-lxc"',
]) {
  a.ok(b.includes(marker),`Runtime bundle contract hiányzik: ${marker}`);
}

console.log('PROXMOX_RUNTIME_BUNDLE_INSTALLER=PASSED');
console.log('PROXMOX_RUNTIME_BUNDLE_WEB_UI=PASSED');
console.log('PROXMOX_RUNTIME_BUNDLE_SELF_UPDATE=PASSED');
