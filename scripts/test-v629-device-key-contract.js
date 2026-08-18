#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const bridge = fs.readFileSync('desktop-tauri/src-tauri/src/credential_bridge.rs','utf8');

assert.match(bridge,/const MIN_SECRET_BYTES: usize = 16;/);
assert.match(lib,/value\.len\(\)\s*<\s*16/);
assert.doesNotMatch(lib,/value\.len\(\)\s*<\s*24/);
assert.match(lib,/\(0x21\.\.=0x7e\)\.contains\(&byte\)/);
assert.match(lib,/Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként/);
assert.match(bridge,/validate_secret\("api-v2-bearer", "0123456789abcdef"\)\.is_ok\(\)/);
assert.match(bridge,/validate_secret\("api-v2-bearer", "too-short"\)\.is_err\(\)/);

console.log('V629_CREDENTIAL_STORE_MIN_16=PASSED');
console.log('V629_HTTP_HEADER_MIN_16=PASSED');
console.log('V629_PRINTABLE_ASCII_HEADER_SAFETY=PRESERVED');
console.log('V629_CROSS_LAYER_DEVICE_KEY_CONTRACT=PASSED');
