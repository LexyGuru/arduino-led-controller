#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'firmware/ArduinoLedController/ArduinoLedController.ino');
const src = fs.readFileSync(file, 'utf8');
function has(v, m) { assert.ok(src.includes(v), m); }

has('#define FIRMWARE_VERSION versionSsot.firmware', 'firmware version changed unexpectedly');
has('#define DIRECT_API_VERSION versionSsot.directApi', 'Direct API version changed unexpectedly');
has('perfStatusBuilds', 'status timing counters missing');
has('perfLedJsonApplies', 'LED JSON timing counters missing');
has('perfLedNoopUpdates', 'LED semantic no-op counter missing');
has('perfDirtyFlushNoops', 'dirty flush no-op counter missing');
has('perfScheduleRuns', 'scheduler timing counters missing');
has('perfDirectEepromPutCalls', 'direct EEPROM.put timing counters missing');
has('template <typename T>\nvoid eepromPutMeasured', 'measured EEPROM.put helper missing');
has('eepromPutMeasured(0, networkSettings);', 'network settings must use measured put');
has('eepromPutMeasured(API_SETTINGS_EEPROM_OFFSET, apiSettings);', 'API settings must use measured put');
has('eepromPutMeasured(TIME_SETTINGS_EEPROM_OFFSET, timeSettings);', 'time settings must use measured put');
has('eepromPutMeasured(OTA_SUCCESS_MARKER_EEPROM_OFFSET, value);', 'OTA marker must use measured put');
has('const unsigned long startedUs = micros();\n  FixedBuffer b;', 'status build timer missing');
has('const unsigned long parseStartedUs = micros();', 'LED JSON timer missing');
has('if (!changed) perfLedNoopUpdates++;', 'LED no-op accounting missing');
has('const unsigned long reconcileStartedUs = micros();', 'scheduler timer missing');
has('perfScheduleTotalUs += reconcileDurationUs;', 'scheduler timing aggregation missing');
has('eepromAB=%lu/%luB', 'expanded EEPROM A/B perf summary missing');
has('status=%lu avg=%luus max=%luus', 'status perf summary missing');
has('schedule=%lu avg=%luus max=%luus', 'scheduler perf summary missing');
assert.strictEqual((src.match(/EEPROM\.put\(/g) || []).length, 1,
  'all production EEPROM.put calls except helper internals must be routed through eepromPutMeasured');

console.log('V785_STATUS_BUILD_TIMING=PASSED');
console.log('V785_LED_JSON_TIMING=PASSED');
console.log('V785_LED_NOOP_ACCOUNTING=PASSED');
console.log('V785_SCHEDULER_TIMING=PASSED');
console.log('V785_DIRECT_EEPROM_PUT_INSTRUMENTATION=PASSED');
console.log('V785_PERFORMANCE_BASELINE_LOGGING=PASSED');
console.log('V785_API_VERSION_UNCHANGED=PASSED');
console.log('V785_FIRMWARE_PERFORMANCE_FOUNDATION_MEGA2=PASSED');
