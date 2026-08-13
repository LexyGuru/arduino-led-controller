#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');

assert.match(lib,/OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(5\)/);
assert.match(lib,/CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/);

assert.match(lib,/let connect_timeout = OTA_CONNECT_TIMEOUT\.min\(remaining\);/);
assert.match(lib,/std::thread::sleep\(OTA_CONNECT_RETRY_DELAY\.min\(remaining\)\);/);

assert.ok(lib.includes('OTA_LISTENER_TIMEOUT_PENDING_API_VERIFICATION'));
assert.ok(lib.includes('továbblépek a 180 másodperces Direct API életjel / firmware / reboot ellenőrzésre'));

assert.doesNotMatch(
  lib,
  /let mut stream = stream\.ok_or_else\(\(\) =>[\s\S]{0,500}OTA_LISTENER_STARTUP_TIMEOUT/
);

assert.match(
  lib,
  /confirm_restart\(app,\s*state,\s*artifact\.firmware_version\.clone\(\),\s*boot_id_before\.as_deref\(\)\)\.await\?/s
);
assert.match(
  lib,
  /confirm_restart\(app,\s*state,\s*None,\s*boot_id_before\.as_deref\(\)\)\.await\?/s
);

assert.match(lib,/let reboot_confirmed = boot_id_before/);
assert.match(lib,/normalize_version\(wanted\) == normalize_version\(actual\)\s*&& reboot_confirmed/s);
assert.match(lib,/get_json\(state,\s*"\/api\/v1\/status"\)\.await/);

console.log('OTA_LISTENER_STARTUP_TIMEOUT_SECONDS=5');
console.log('LISTENER_TIMEOUT=NONTERMINAL');
console.log('LISTENER_TIMEOUT_TO_180S_API_GATE=PASSED');
console.log('API_CONFIRM_REQUIRES_REBOOT_WHEN_BOOT_ID_AVAILABLE=PASSED');
console.log('POST_FLASH_CONFIRM_TIMEOUT_SECONDS=180');
console.log('V366_MOBILE_OTA_5S_TO_180S_API_GATE_CONTRACT=PASSED');
