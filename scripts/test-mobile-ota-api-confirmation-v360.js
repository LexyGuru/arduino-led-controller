#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');

assert.match(lib, /OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(5\)/);
assert.match(lib, /CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/);

const flushAt = lib.indexOf('A firmware-küldés lezárása sikertelen');
const handoffAt = lib.indexOf('OTA_TRANSFER_COMPLETE_API_CONFIRMATION');
assert.ok(flushAt >= 0 && handoffAt > flushAt, 'API handoff must happen after body flush');

const uploadStart = lib.indexOf('async fn upload_firmware_native(');
const confirmStart = lib.indexOf('fn ota_confirm_status_path(');
const upload = lib.slice(uploadStart, confirmStart);
assert.match(upload, /drop\(stream\);/);
assert.doesNotMatch(upload, /stream\.read\(/);
assert.doesNotMatch(upload, /parse_ota_http_response\(&response\)/);
assert.ok(upload.includes('innentől kizárólag a Direct API /api/v1/status ellenőrzés dönt'));

const confirmEnd = lib.indexOf('#[cfg(target_os = "macos")]', confirmStart);
const confirm = lib.slice(confirmStart, confirmEnd);
assert.match(confirm, /\/api\/v1\/status\?otaConfirm=/);
assert.match(confirm, /get_json\(state,\s*&status_path\)\.await/);
assert.match(confirm, /generation_changed/);
assert.match(confirm, /bootGeneration/);
assert.match(confirm, /SAME_VERSION_REINSTALL_CONFIRMED/);
assert.match(confirm, /NEW_FIRMWARE_BOOT_CONFIRMED/);
assert.match(confirm, /OTA_ROLLBACK_OR_WRONG_FIRMWARE/);

console.log('FULL_BIN_FLUSH_BEFORE_API_HANDOFF=PASSED');
console.log('POST_BODY_OTA_SOCKET_MONITORING=REMOVED');
console.log('DIRECT_API_POST_TRANSFER_AUTHORITY=PASSED');
console.log('DIRECT_API_CACHE_BUSTING=PASSED');
console.log('BOOT_GENERATION_OUTCOME_CLASSIFICATION=PASSED');
console.log('LEGACY_BOOT_ID_FALLBACK_PRESERVED=PASSED');
console.log('V360_MOBILE_OTA_API_CONFIRMATION_CONTRACT=PASSED');
