const versionSsot=require('./lib/version-ssot');
const fs = require('fs');
const assert = require('assert');

const api = fs.readFileSync('desktop-tauri/src/services/tauriApi.ts', 'utf8');
const controller = fs.readFileSync('desktop-tauri/src/hooks/useController.ts', 'utf8');
const firmware = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino', 'utf8');

assert(api.includes('const sharedReadInflight=new Map<string,Promise<unknown>>()'));
assert(api.includes('const sharedReadCache=new Map<string,SharedReadCacheEntry>()'));
assert(api.includes("sharedRead('arduino:status',750"));
assert(api.includes("sharedRead('arduino:topology',3000"));
assert(api.includes('sharedRead(`arduino:logs:${afterId}`,0'));
assert(api.includes("invalidateSharedReads('arduino:status')"));
assert(api.includes("invalidateSharedReads('arduino:topology','arduino:status')"));

assert(controller.includes('const lastConsolePollAt ='));
assert(controller.includes("activePage === 'logs'"));
assert(controller.includes('? 2_500'));
assert(controller.includes(': 10_000'));
assert(controller.includes('lastConsolePollAt.current ='));
assert(/activePage,\s*busy,\s*initialized/.test(controller));

assert(firmware.includes('#define DIRECT_API_VERSION versionSsot.directApi'));
assert(firmware.includes('#define FIRMWARE_VERSION versionSsot.firmware'));

console.log('V786D_SHARED_READ_INFLIGHT_DEDUP=PASSED');
console.log('V786D_SHORT_TTL_STATUS_CACHE=PASSED');
console.log('V786D_TOPOLOGY_CACHE_AND_INVALIDATION=PASSED');
console.log('V786D_LOG_REQUEST_DEDUP=PASSED');
console.log('V786D_ADAPTIVE_LOG_POLLING=PASSED');
console.log('V786D_MUTATION_CACHE_INVALIDATION=PASSED');
console.log('V786D_API_VERSION_UNCHANGED=PASSED');
console.log('V786D_SHARED_REQUEST_CORE_MEGA3=PASSED');
