#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'firmware/ArduinoLedController/ArduinoLedController.ino');
const src = fs.readFileSync(file, 'utf8');

function has(value, message) { assert.ok(src.includes(value), message); }

has('#define FIRMWARE_VERSION versionSsot.firmware', 'firmware version must stay unchanged');
has('#define DIRECT_API_VERSION versionSsot.directApi', 'Direct API must stay at 1.1.0');
has('bool ledDirty[STRIP_COUNT] = {true, true, true};', 'dirty strip state missing');
has('void markLedDirty(uint8_t index)', 'dirty marker missing');
has('void renderDirty()', 'dirty renderer missing');
has('recordRenderPerformance(startedUs, rendered);', 'dirty render timing missing');
has('perfEepromChangedBytes', 'EEPROM changed-byte instrumentation missing');
has('perfHttpMaxDurationMs', 'HTTP max latency instrumentation missing');
has('bool applyLedJson(uint8_t index, const char* body, bool renderNow = true)', 'batchable LED apply missing');
has('if (changed) markLedDirty(index);', 'no-op aware LED mutation missing');
has('if (renderNow) renderDirty();', 'single-strip dirty flush missing');
has('applyLedJson(i, body, false)', 'all-strip route must defer rendering');
has('renderDirty();\n    sendStatusJson(c, requestId); return 200;', 'all-strip route must render once');
has('applyStoredLed(led, expected);', 'scheduler apply path missing');
has('markLedDirty(index);', 'scheduler must mark affected strip dirty');
assert.ok(!src.includes('applyLedJson(i, body)) {\n        sendErrorJson'), 'old all-strip immediate render path remains');
assert.ok(!src.includes('if (changed) {\n    renderAll(true);\n    schedulerLastAppliedAt'), 'scheduler still forces all strips');

console.log('V784_DIRTY_STRIP_RENDERING=PASSED');
console.log('V784_LED_BATCHING=PASSED');
console.log('V784_RENDER_INSTRUMENTATION=PASSED');
console.log('V784_EEPROM_WRITE_INSTRUMENTATION=PASSED');
console.log('V784_HTTP_LATENCY_INSTRUMENTATION=PASSED');
console.log('V784_API_VERSION_UNCHANGED=PASSED');
console.log('V784_FIRMWARE_PERFORMANCE_FOUNDATION=PASSED');
