'use strict';
const versionSsot=require('./lib/version-ssot');

const assert = require('assert');
const fs = require('fs');

const firmware = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8'
);
const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8')
);

for (const token of [
  `FIRMWARE_VERSION "${versions.firmware}"`,
  'f14-complete-direct-api-storage',
  'DIRECT_API_VERSION versionSsot.directApi',
  'API_ALLOW_QUERY_KEY_FALLBACK 0',
  'CONFIG_SLOT_A_OFFSET',
  'CONFIG_SLOT_B_OFFSET',
  'SCHEDULE_SLOT_A_OFFSET',
  'SCHEDULE_SLOT_B_OFFSET',
  'StorageSlotHeader',
  'loadPersistentConfig',
  'saveConfigAb',
  'beginScheduleTransaction',
  'writeScheduleTransactionRecord',
  'commitScheduleTransaction',
  'PAYLOAD_TOO_LARGE',
  'LEGACY_MUTATION_REMOVED',
  '/api/v1/leds/all',
  '/api/v1/schedules/transactions'
]) {
  assert.ok(
    firmware.includes(token),
    `Hiányzó F14 firmware contract: ${token}`
  );
}

assert.ok(
  !firmware.includes('#define API_ALLOW_QUERY_KEY_FALLBACK 1')
);

console.log(
  `OK: F14 Complete firmware source contract ${versions.firmware}`
);
