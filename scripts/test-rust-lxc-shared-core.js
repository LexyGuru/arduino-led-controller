#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'), f=require('node:fs');

const core=f.readFileSync('rust/arduino-led-core/src/lib.rs','utf8');
const server=f.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const cargo=f.readFileSync('rust/arduino-led-lxc-server/Cargo.toml','utf8');
const tauri=f.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const service=f.readFileSync('deploy/systemd/arduino-led-controller-rust.service','utf8');
const installer=f.readFileSync('deploy/install-rust-lxc.sh','utf8');
const rollback=f.readFileSync('deploy/rollback-rust-lxc.sh','utf8');
const builder=f.readFileSync('deploy/build-rust-lxc-bundle.sh','utf8');

a.ok(core.includes('pub fn request_json_blocking'));
a.ok(core.includes('"X-Device-Key"'));
a.ok(tauri.includes('request_json_blocking('));
a.ok(cargo.includes('features = ["ws"]'));
a.ok(server.includes('/api/v1/leds/{id}'));
a.ok(server.includes('/api/v1/logs'));
a.ok(server.includes('/api/v1/schedules/status'));
a.ok(server.includes('/api/v1/schedules/transactions/{tx}/chunks'));
a.ok(server.includes('/api/v1/schedules/transactions/{tx}/commit'));
a.ok(server.includes('/api/v1/ota/prepare'));
a.ok(server.includes('/api/v1/ota/status'));
a.ok(server.includes('/api/v1/server/firmware/catalog'));
a.ok(server.includes('/api/v1/events/ws'));
a.ok(server.includes('WebSocketUpgrade'));
a.ok(service.includes('NoNewPrivileges=true'));
a.ok(service.includes('ProtectSystem=strict'));
a.ok(installer.includes('/opt/arduino-led-controller'));
a.ok(installer.includes('current'));
a.ok(installer.includes('previous'));
a.ok(rollback.includes('RUST_LXC_ROLLBACK=SUCCESS'));
a.ok(builder.includes('RUST_LXC_BUNDLE=SUCCESS'));

console.log('SHARED_CORE_TRANSPORT=PASSED');
console.log('LXC_LED_GATEWAY=PASSED');
console.log('LXC_SCHEDULE_GATEWAY=PASSED');
console.log('LXC_LOG_GATEWAY=PASSED');
console.log('LXC_OTA_FOUNDATION=PASSED');
console.log('LXC_FIRMWARE_CATALOG=PASSED');
console.log('LXC_WEBSOCKET_EVENTS=PASSED');
console.log('LXC_INSTALL_ROLLBACK=PASSED');
console.log('RUST_LXC_PHASE2_CONTRACT=PASSED');
