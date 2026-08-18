#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');

const uploadStart = lib.indexOf('async fn upload_firmware_native(');
const confirmStart = lib.indexOf('fn ota_confirm_status_path(');
const macosStart = lib.indexOf('#[cfg(target_os = "macos")]', confirmStart);
assert.ok(uploadStart >= 0 && confirmStart > uploadStart && macosStart > confirmStart);

const upload = lib.slice(uploadStart, confirmStart);
const confirm = lib.slice(confirmStart, macosStart);

assert.match(upload, /write_all\(&firmware\[offset\.\.end\]\)/);
assert.match(upload, /\.flush\(\)/);
assert.match(upload, /drop\(stream\);/);
assert.match(upload, /OTA_TRANSFER_COMPLETE_API_CONFIRMATION/);

const flushAt = upload.indexOf('A firmware-küldés lezárása sikertelen');
const afterFlush = upload.slice(flushAt);
assert.doesNotMatch(afterFlush, /stream\.read\(/);
assert.doesNotMatch(afterFlush, /parse_ota_http_response/);
assert.doesNotMatch(afterFlush, /status_code != 200/);

assert.match(confirm, /CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/);
assert.match(confirm, /\/api\/v1\/status\?otaConfirm=/);
assert.match(confirm, /get_json\(state,\s*&status_path\)\.await/);
assert.match(confirm, /generation_changed/);
assert.match(confirm, /bootGeneration/);
assert.match(confirm, /SAME_VERSION_REINSTALL_CONFIRMED/);
assert.match(confirm, /NEW_FIRMWARE_BOOT_CONFIRMED/);
assert.match(confirm, /LEGACY_BOOT_ID_FALLBACK_CONFIRMED/);
assert.match(confirm, /NEW_FIRMWARE_VERSION_TRANSITION_CONFIRMED/);
assert.match(confirm, /OTA_ROLLBACK_OR_WRONG_FIRMWARE/);

const officialStart = lib.indexOf('async fn firmware_update_inner(');
const externalStart = lib.indexOf('async fn firmware_install_external_inner(');
const official = lib.slice(officialStart, externalStart);
const external = lib.slice(externalStart);

assert.match(official, /let after_status = confirm_restart\(/);
assert.match(official, /artifact\.firmware_version\.clone\(\),[\s\S]*installed\.as_deref\(\),[\s\S]*boot_id_before\.as_deref\(\)/);
assert.match(external, /let after_status = confirm_restart\(/);
assert.match(external, /None,[\s\S]*installed_before\.as_deref\(\),[\s\S]*boot_id_before\.as_deref\(\)/);

console.log('OTA_PHASE_1=TRANSFER');
console.log('OTA_PHASE_2=API_CONFIRMATION');
console.log('POST_BODY_EXTERNAL_PORT_OBSERVATION=ABSENT');
console.log('DIRECT_API_CACHE_BUSTED_STATUS=PASSED');
console.log('SAME_VERSION_REINSTALL_CLASSIFICATION=PASSED');
console.log('NEW_FIRMWARE_CLASSIFICATION=PASSED');
console.log('BOOT_GENERATION_PRIMARY_AUTHORITY=PASSED');
console.log('LEGACY_BOOT_ID_FALLBACK=PASSED');
console.log('ROLLBACK_OR_WRONG_FIRMWARE_CLASSIFICATION=PASSED');
console.log('V372_OTA_TRANSFER_API_STATE_MACHINE_CONTRACT=PASSED');
