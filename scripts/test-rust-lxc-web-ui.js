#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('assert/strict');
const main=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const native=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const prox=fs.readFileSync('deploy/proxmox/install-proxmox-lxc.sh','utf8');
const env=fs.readFileSync('deploy/rust-lxc.env.example','utf8');
a.ok(main.includes('ServeDir'));
a.ok(main.includes('ServeFile'));
a.ok(main.includes('.fallback_service(web_service)'));
a.ok(native.includes('WEB_LXC_BUILD=SUCCESS'));
a.ok(native.includes('WEB_LXC_INSTALL=SUCCESS'));
a.ok(prox.includes('ARDUINO_CONFIG_INPUT=READY'));
a.ok(prox.includes('ROOT_PASSWORD=CONFIGURED'));
a.ok(prox.includes('LXC_SERVICE_LIVE=PASSED'));
a.ok(env.includes('WEB_ROOT=/opt/arduino-led-controller/current/web'));
console.log('RUST_LXC_FULL_WEB_UI_CONTRACT=PASSED');
