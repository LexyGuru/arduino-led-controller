#!/usr/bin/env node
'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');
const updater=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');
const installer=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const service=fs.readFileSync('deploy/systemd/arduino-led-controller-rust.service','utf8');
assert.ok(updater.includes('umask 077'));
assert.ok(service.includes('User=arduino-led'));
for(const marker of ['install -d -m 0755 "${RELEASE}" "${RELEASE}/bin" "${RELEASE}/web"','find "${RELEASE}/web" -type d -exec chmod 0755 {} +','find "${RELEASE}/web" -type f -exec chmod 0644 {} +','runuser -u arduino-led -- test -r "${RELEASE}/web/index.html"','runuser -u arduino-led -- test -x "${RELEASE}/web"','WEB_ASSET_PERMISSIONS=OK','RUNTIME_GATE_LIVE=${live} HTTP=${live_http}','RUNTIME_GATE_WEB=${web} HTTP=${web_http}','LIVE=${live}/${live_http} WEB=${web}/${web_http}','ROLLBACK=SUCCESS','ARDUINO_READY=YES','UPDATE=SUCCESS']) assert.ok(updater.includes(marker),`updater marker hiányzik: ${marker}`);
for(const marker of ['install -d -m 0755 "$RELEASE" "$RELEASE/bin" "$RELEASE/web"','find "$RELEASE/web" -type d -exec chmod 0755 {} +','find "$RELEASE/web" -type f -exec chmod 0644 {} +','runuser -u arduino-led -- test -r "$RELEASE/web/index.html"','runuser -u arduino-led -- test -x "$RELEASE/web"','WEB_LXC_PERMISSIONS=SUCCESS','WEB_LXC_INSTALL=SUCCESS']) assert.ok(installer.includes(marker),`installer marker hiányzik: ${marker}`);
console.log('WEB_DIR_MODE_0755=YES');
console.log('WEB_FILE_MODE_0644=YES');
console.log('SERVICE_USER_WEB_READ_PREFLIGHT=YES');
console.log('RUNTIME_GATE_HTTP_DIAGNOSTICS=YES');
console.log('ROLLBACK_CONTRACT=PRESERVED');
console.log('LXC_WEB_PERMISSION_RUNTIME_GATE_CONTRACT=PASSED');
