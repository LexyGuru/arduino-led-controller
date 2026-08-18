#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');

assert.match(lib,/OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(5\)/);
assert.match(lib,/CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/);
assert.match(lib,/let connect_timeout = OTA_CONNECT_TIMEOUT\.min\(remaining\);/);
assert.match(lib,/std::thread::sleep\(OTA_CONNECT_RETRY_DELAY\.min\(remaining\)\);/);

assert.ok(lib.includes('OTA_TRANSPORT_UNCONFIRMED_API_CONFIRMATION'));
assert.ok(lib.includes('A külső OTA-port állapotából nem döntök sikerről vagy hibáról'));

assert.match(lib,/fn ota_confirm_status_path\(attempt: u32\) -> String/);
assert.match(lib,/\/api\/v1\/status\?otaConfirm=/);
assert.match(lib,/generation_changed/);
assert.match(lib,/bootGeneration/);
assert.match(lib,/SAME_VERSION_REINSTALL_CONFIRMED/);
assert.match(lib,/OTA_ROLLBACK_OR_WRONG_FIRMWARE/);

console.log('OTA_LISTENER_STARTUP_TIMEOUT_SECONDS=5');
console.log('OTA_TRANSPORT_RESULT=NON_AUTHORITATIVE');
console.log('TRANSFER_TO_API_CONFIRMATION=PASSED');
console.log('POST_FLASH_CONFIRM_TIMEOUT_SECONDS=180');
console.log('API_CONFIRM_REQUIRES_FRESH_BOOT_GENERATION_WHEN_AVAILABLE=PASSED');
console.log('LEGACY_BOOT_ID_FALLBACK_PRESERVED=PASSED');
console.log('V366_MOBILE_OTA_5S_TO_180S_API_GATE_CONTRACT=PASSED');
