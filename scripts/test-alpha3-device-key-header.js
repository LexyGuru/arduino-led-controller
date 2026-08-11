#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8');

const versions = JSON.parse(read('release-versions.json'));
const release = JSON.parse(read('firmware/firmware-release.json'));
const firmware = read(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
);
const secrets = read(
  'firmware/ArduinoLedController/secrets.example.h',
);
const serverClient = read('server/arduino/arduino-client.js');
const desktopRust = read('desktop-tauri/src-tauri/src/lib.rs');
const sharedRustCore = read('rust/arduino-led-core/src/lib.rs');

assert.match(versions.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(release.firmwareVersion, versions.firmware);
assert.equal(release.directApiVersion, versions.directApi);
assert.ok(
  firmware.includes(
    `#define FIRMWARE_VERSION "${versions.firmware}"`,
  ),
  `A firmware verziója nem egyezik: ${versions.firmware}`,
);
assert.ok(
  firmware.includes(
    `#define DIRECT_API_VERSION "${versions.directApi}"`,
  ),
  `A Direct API verziója nem egyezik: ${versions.directApi}`,
);

assert.match(
  firmware,
  /#define API_DEVICE_KEY_HEADER "X-Device-Key"/,
);
assert.match(firmware, /constantTimeEquals/);
assert.match(firmware, /DUPLICATE_DEVICE_KEY_HEADER/);
assert.match(firmware, /MISSING_DEVICE_KEY/);
assert.match(firmware, /INVALID_DEVICE_KEY/);
assert.match(firmware, /httpHeaderAuthAccepted/);
assert.match(firmware, /httpQueryFallbackAccepted/);
assert.match(
  firmware,
  /#define API_ALLOW_QUERY_KEY_FALLBACK 0/,
);
assert.match(secrets, /API_ALLOW_QUERY_KEY_FALLBACK 0/);
assert.match(serverClient, /X-Device-Key/i);
assert.match(sharedRustCore, /X-Device-Key/i);
assert.match(sharedRustCore, /header\("X-Device-Key",\s*target\.device_key\.trim\(\)\)/);
assert.match(desktopRust, /request_json_blocking/);
assert.match(desktopRust, /DirectApiTarget/);
assert.doesNotMatch(serverClient, /[?&]k=/);
assert.doesNotMatch(desktopRust, /[?&]k=/);
assert.doesNotMatch(sharedRustCore, /[?&]k=/);
assert.match(firmware, /PRIVATE_PATH_NOT_FOUND/);
assert.match(firmware, /X-Request-Id/);

console.log(
  `OK: firmware ${versions.firmware}, Direct API ${versions.directApi} verzió contract`,
);
console.log(
  'OK: X-Device-Key a firmware, Node és Tauri elsődleges authja',
);
console.log(
  'OK: duplikált/hiányzó/hibás fejléc külön hibakódot kap',
);
console.log('OK: Node, Tauri és shared Rust core nem használ query-kulcsot');
console.log('OK: aktív firmware query fallbackje kikapcsolva');
console.log('OK: privát útvonalhiba nem néma TCP-close');
