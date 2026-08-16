#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
assert.match(rust,/if matches!\(mode, "auto" \| "bundled"\) \{\s*return Ok\(false\);/s);
assert.match(rust,/error\.raw_os_error\(\) == Some\(65\)/);
assert.equal((rust.match(/AUTO_TERMINAL_FALLBACK_UNAVAILABLE/g)||[]).length,2);
assert.equal((rust.match(/let \(terminal_address, terminal_port\) = status_ota_target\(&status_json\)\?/g)||[]).length,2);
assert.equal((rust.match(/native_error\.starts_with\("OTA_TRANSPORT_CONNECT_FAILED"\)/g)||[]).length,2);
assert.match(rust,/AUTO_TERMINAL_FALLBACK:\{tool\}/);
assert.match(rust,/let transfer_result = upload_result\?;[\s\S]*confirm_restart\(/);
console.log('MACOS_AUTO_TERMINAL_OTA_FALLBACK_RELEASE=PASSED');
console.log('MACOS_AUTO_TERMINAL_OTA_FALLBACK_EXTERNAL=PASSED');
console.log('OTA_CONFIRMATION_AFTER_TRANSFER_ONLY=PASSED');
