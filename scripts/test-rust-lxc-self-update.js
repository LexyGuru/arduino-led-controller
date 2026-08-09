#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('assert/strict');

const u=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');
const n=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const p=fs.readFileSync('deploy/proxmox/install-proxmox-lxc.sh','utf8');
const svc=fs.readFileSync('deploy/systemd/arduino-led-controller-update.service','utf8');
const tim=fs.readFileSync('deploy/systemd/arduino-led-controller-update.timer','utf8');

a.ok(u.includes('git ls-remote'));
a.ok(u.includes('flock -n'));
a.ok(u.includes('npm run build'));
a.ok(u.includes('cargo test --locked'));
a.ok(u.includes('/health/live'));
a.ok(u.includes('http://127.0.0.1:3000/'));
a.ok(u.includes('ARDUINO_READY=NO'));
a.ok(u.includes('ROLLBACK=SUCCESS'));
a.ok(u.includes('UPDATE=SUCCESS'));
a.ok(u.includes('UPDATER_BIN="/usr/local/sbin/arduino-led-controller-update"'));
a.ok(u.includes('CONTROL_PLANE_UNITS=UPDATED'));
a.ok(u.includes('CONTROL_PLANE_RUNTIME_GATE_LIVE='));
a.ok(u.includes('CONTROL_PLANE_RUNTIME_GATE_WEB='));
a.ok(u.includes('CONTROL_PLANE_RUNTIME_GATE_V5_ICON='));
a.ok(u.includes('CONTROL_PLANE_ROLLBACK=START'));
a.ok(u.includes('CONTROL_PLANE_RELEASE_ROLLBACK=SUCCESS'));
a.ok(u.includes('CONTROL_PLANE_UPDATER=UPDATED'));
a.ok(u.includes('CONTROL_PLANE_TIMER=ENABLED'));
a.ok(u.includes('CONTROL_PLANE_TRANSACTION=SUCCESS'));
a.ok(n.includes('LXC_SELF_UPDATE_TIMER=ENABLED'));
a.ok(n.includes('installed-commit'));
a.ok(p.includes('UPDATE_CHANNEL_SELECTED='));
a.ok(svc.includes('Type=oneshot'));
a.ok(tim.includes('OnUnitActiveSec=6h'));
a.ok(tim.includes('RandomizedDelaySec=20min'));
a.ok(tim.includes('Persistent=true'));

console.log('LXC_SELF_UPDATE_REMOTE_HEAD=PASSED');
console.log('LXC_SELF_UPDATE_LIVE_WEB_GATE=PASSED');
console.log('LXC_SELF_UPDATE_ARDUINO_NOT_ROLLBACK_GATE=PASSED');
console.log('LXC_SELF_UPDATE_ROLLBACK=PASSED');
console.log('LXC_SELF_UPDATE_CHANNEL_AWARE=PASSED');
console.log('LXC_SELF_UPDATE_TIMER=PASSED');
console.log('LXC_SELF_UPDATE_CONTROL_PLANE_TRANSACTION=PASSED');
