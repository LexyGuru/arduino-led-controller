'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const versions = JSON.parse(read('release-versions.json'));
const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');
const secrets = read('firmware/ArduinoLedController/secrets.example.h');
const serverClient = read('server/arduino/arduino-client.js');
const desktopRust = read('desktop-tauri/src-tauri/src/lib.rs');

assert.equal(versions.firmware, '4.3.0-beta.3');
assert.ok(
  firmware.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`),
  `A firmware verziója nem egyezik a release-versions.json értékével: ${versions.firmware}`,
);
assert.match(firmware, /#define API_DEVICE_KEY_HEADER "X-Device-Key"/);
assert.match(firmware, /constantTimeEquals/);
assert.match(firmware, /DUPLICATE_DEVICE_KEY_HEADER/);
assert.match(firmware, /MISSING_DEVICE_KEY/);
assert.match(firmware, /INVALID_DEVICE_KEY/);
assert.match(firmware, /httpHeaderAuthAccepted/);
assert.match(firmware, /httpQueryFallbackAccepted/);
assert.match(firmware, /#define API_ALLOW_QUERY_KEY_FALLBACK 0/);
assert.match(secrets, /API_ALLOW_QUERY_KEY_FALLBACK 0/);
assert.match(serverClient, /X-Device-Key/i);
assert.match(desktopRust, /X-Device-Key/i);
assert.doesNotMatch(serverClient, /[?&]k=/);
assert.doesNotMatch(desktopRust, /[?&]k=/);
assert.match(firmware, /PRIVATE_PATH_NOT_FOUND/);
assert.match(firmware, /X-Request-Id/);

console.log(`OK: firmware verzió contract ${versions.firmware}`);
console.log('OK: X-Device-Key a firmware, Node és Tauri elsődleges authja');
console.log('OK: duplikált/hiányzó/hibás fejléc külön hibakódot kap');
console.log('OK: Node és Tauri nem használ query-kulcsot');
console.log('OK: aktív firmware query fallbackje kikapcsolva');
console.log('OK: privát útvonalhiba nem néma TCP-close');
