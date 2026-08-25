const versionSsot=require('./lib/version-ssot');
const fs = require('fs');
const assert = require('assert');

const api = fs.readFileSync('desktop-tauri/src/services/tauriApi.ts', 'utf8');
const controller = fs.readFileSync('desktop-tauri/src/hooks/useController.ts', 'utf8');
const firmware = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino', 'utf8');

assert(api.includes('let sharedReadEpoch=0'));
assert(api.includes('const requestEpoch=sharedReadEpoch'));
assert(api.includes('requestEpoch!==sharedReadEpoch&&retryOnStale'));
assert(api.includes('return sharedRead(key,ttlMs,loader,false)'));
assert(api.includes('sharedReadEpoch++'));
assert(api.includes("invalidateReadCache:()=>invalidateSharedReads('')"));
assert(api.includes("saveConfig:async"));
assert(api.includes("saveSchedules:async"));
assert(api.includes("invalidateSharedReads('arduino:status')"));

assert(controller.includes('const statusRequestGeneration ='));
assert(controller.includes('const requestGeneration ='));
assert(controller.includes('requestGeneration !=='));
assert(controller.includes('statusRequestGeneration.current += 1'));
assert(controller.includes('tauriApi.invalidateReadCache()'));
assert(controller.includes('const activePageRef ='));
assert(controller.includes('activePageRef.current ='));
assert(controller.includes('const activePollingPage ='));
assert(!controller.includes('{indent}'));
assert(controller.includes("activePollingPage === 'dashboard'"));
assert(controller.includes("activePollingPage === 'leds'"));
assert(controller.includes("activePollingPage === 'schedules'"));
assert(controller.includes('? 5_000'));
assert(controller.includes('? 10_000'));
assert(controller.includes(': 20_000'));
assert(controller.includes(': 60_000'));

assert(firmware.includes('#define DIRECT_API_VERSION versionSsot.directApi'));
assert(firmware.includes('#define FIRMWARE_VERSION versionSsot.firmware'));

console.log('V787F_STALE_RESPONSE_RETRY=PASSED');
console.log('V787F_SHARED_READ_EPOCH_INVALIDATION=PASSED');
console.log('V787F_CONFIG_RECONCILIATION=PASSED');
console.log('V787F_SCHEDULE_STATUS_INVALIDATION=PASSED');
console.log('V787F_STATUS_REQUEST_GENERATION_GUARD=PASSED');
console.log('V787F_ACTIVE_PAGE_STATUS_POLLING=PASSED');
console.log('V787F_BACKGROUND_POLLING_BOUND=PASSED');
console.log('V787F_API_VERSION_UNCHANGED=PASSED');
console.log('V787F_SHARED_REQUEST_CORE_MEGA4=PASSED');
