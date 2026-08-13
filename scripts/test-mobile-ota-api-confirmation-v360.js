#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');

assert.match(lib, /OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(120\)/);
assert.match(lib, /CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/);

const flushAt = lib.indexOf('A firmware-küldés lezárása sikertelen');
const pendingAt = lib.indexOf('OTA_HTTP_CONFIRMATION_PENDING_API_VERIFICATION');
assert.ok(flushAt >= 0 && pendingAt > flushAt, 'fallback must only happen after body flush');

assert.ok(lib.includes('a sikerességet most a normál Arduino API életjelével ellenőrzöm'));
assert.doesNotMatch(lib, /if response\.is_empty\(\)\s*\{\s*return Err\("Az Arduino üres OTA-választ adott\./s);

assert.match(lib, /if status_code != 200/);
for (const code of ['401','404','413','414','500']) {
  assert.ok(lib.includes(`${code} =>`), `HTTP ${code} handling missing`);
}

const officialStart = lib.indexOf('async fn firmware_update_inner(');
const externalStart = lib.indexOf('async fn firmware_install_external_inner(');
const official = lib.slice(officialStart, externalStart);
assert.match(official, /upload_firmware_native\(/);
assert.match(official, /upload_result\?;/);
assert.match(official, /confirm_restart\(app,\s*state,\s*artifact\.firmware_version\.clone\(\)\)\.await\?/s);
assert.ok(official.indexOf('upload_result?;') < official.indexOf('confirm_restart(app, state, artifact.firmware_version.clone()).await?'));

const external = lib.slice(externalStart);
assert.match(external, /upload_firmware_native\(/);
assert.match(external, /confirm_restart\(app,\s*state,\s*None\)\.await\?/s);

const confirmStart = lib.indexOf('async fn confirm_restart(');
const confirmTail = lib.slice(confirmStart, confirmStart + 7000);
assert.match(confirmTail, /get_json\(state,\s*"\/api\/v1\/status"\)\.await/);
assert.match(confirmTail, /firmwareVersion/);

console.log('FULL_BIN_BEFORE_CONFIRMATION_FALLBACK=PASSED');
console.log('POST_BODY_SOCKET_CLOSE=API_VERIFICATION_FALLBACK');
console.log('EXPLICIT_HTTP_REJECTION=HARD_ERROR_PRESERVED');
console.log('DDNS_NORMAL_API_HEARTBEAT_PATH=PRESERVED');
console.log('V360_MOBILE_OTA_API_CONFIRMATION_CONTRACT=PASSED');
