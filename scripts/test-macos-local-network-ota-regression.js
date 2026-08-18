#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const plist=fs.readFileSync('desktop-tauri/src-tauri/Info.plist','utf8');
const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
assert.match(plist,/<key>NSLocalNetworkUsageDescription<\/key>/);
const a=rust.indexOf('fn ota_target_from_status('),b=rust.indexOf('\nfn ota_tool_works(',a);
assert.ok(a>=0&&b>a); const target=rust.slice(a,b);
assert.match(target,/if terminal_mode\s*\{\s*return status_ota_target\(status\);\s*\}/s);
assert.match(target,/let configured_ota = config\.ota_address\.trim\(\);/);
assert.match(target,/let port = if config\.ota_port > 0/);
const c=rust.indexOf('async fn upload_firmware_native('),d=rust.indexOf('\nfn ota_confirm_status_path(',c);
assert.ok(c>=0&&d>c); const native=rust.slice(c,d);
assert.match(native,/OTA_TRANSPORT_CONNECT_FAILED/);
assert.doesNotMatch(native,/OTA_TRANSPORT_UNCONFIRMED_API_CONFIRMATION/);
console.log('MACOS_LOCAL_NETWORK_USAGE_DESCRIPTION=PASSED');
console.log('OTA_TARGET_RESOLUTION=PRESERVED');
console.log('OTA_ZERO_BYTE_CONNECT_FAILURE=IMMEDIATE_ERROR');
