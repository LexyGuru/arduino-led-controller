#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const firmwarePath = path.join(
  process.cwd(),
  'firmware',
  'ArduinoLedController',
  'ArduinoLedController.ino',
);
const source = fs.readFileSync(firmwarePath, 'utf8');

assert.match(source, /#define FIRMWARE_VERSION "4\.3\.0-beta\.2"/);
assert.match(source, /#define DIRECT_API_VERSION "1\.0\.0"/);
assert.match(source, /#define API_ALLOW_QUERY_KEY_FALLBACK 0/);
assert.match(source, /constexpr unsigned long REMOTE_REBOOT_DELAY_MS = 750UL;/);
assert.match(source, /base == "\/api\/v1\/system\/reboot" && method == "POST"/);
assert.match(source, /REBOOT_ALREADY_PENDING/);
assert.match(source, /sendJsonLiteral\(c,[\s\S]*?"delayMs\\\":750}[\s\S]*?, 202, requestId\);/);
assert.match(source, /void processPendingRemoteReboot\(\)/);
assert.match(source, /processPendingRemoteReboot\(\);/);
assert.match(source, /NVIC_SystemReset\(\);/);
assert.match(source, /"jsonBodyApi\\\":true/);
assert.match(source, /"eepromAbSlots\\\":true/);
assert.match(source, /"remoteReboot\\\":true/);
assert.doesNotMatch(source, /"jsonBodyApi\\\":false/);
assert.doesNotMatch(source, /"eepromAbSlots\\\":false/);

const routeIndex = source.indexOf('/api/v1/system/reboot');
const responseIndex = source.indexOf('delayMs\\\":750}', routeIndex);
const pendingHandlerIndex = source.lastIndexOf('void processPendingRemoteReboot()');
assert.ok(routeIndex >= 0 && responseIndex > routeIndex && pendingHandlerIndex > responseIndex);

console.log('F14_FINAL_REBOOT_API_CONTRACT=PASSED');
console.log('REMOTE_REBOOT_HTTP_STATUS=202');
console.log('REMOTE_REBOOT_DELAY_MS=750');
console.log('CAPABILITIES_JSON_BODY_API=TRUE');
console.log('CAPABILITIES_EEPROM_AB_SLOTS=TRUE');
console.log('CAPABILITIES_REMOTE_REBOOT=TRUE');
