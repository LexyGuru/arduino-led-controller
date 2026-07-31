'use strict';
const assert=require('assert');const fs=require('fs');
const f=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');
for(const x of ['4.3.0-beta.1','f14-complete-direct-api-storage','DIRECT_API_VERSION "1.0.0"','API_ALLOW_QUERY_KEY_FALLBACK 0','CONFIG_SLOT_A_OFFSET','CONFIG_SLOT_B_OFFSET','SCHEDULE_SLOT_A_OFFSET','SCHEDULE_SLOT_B_OFFSET','StorageSlotHeader','loadPersistentConfig','saveConfigAb','beginScheduleTransaction','writeScheduleTransactionRecord','commitScheduleTransaction','PAYLOAD_TOO_LARGE','LEGACY_MUTATION_REMOVED','/api/v1/leds/all','/api/v1/schedules/transactions']) assert.ok(f.includes(x),x);
assert.ok(!f.includes('#define API_ALLOW_QUERY_KEY_FALLBACK 1'));
console.log('OK: F14 Complete firmware source contract');
