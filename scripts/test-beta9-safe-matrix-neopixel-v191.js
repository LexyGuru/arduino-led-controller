'use strict';

const assert = require('assert');
const fs = require('fs');

const fw = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8'
);

assert.match(fw, /v191-matrix-neopixel-stable/);
assert.doesNotMatch(fw, /v190-neopixel-dirty-dwt-clock/);
assert.doesNotMatch(
  fw,
  /initV190Timebase|serviceV190Timebase|v190MonotonicMillis|v190LastClockSyncMonotonicMs/
);

const start = fw.indexOf('void renderAll(bool force) {');
assert.ok(start >= 0, 'renderAll missing');
const end = fw.indexOf('\n}', start);
const body = fw.slice(start, end + 2);

assert.match(body, /if \(!force\) return;/);
assert.match(body, /for \(uint8_t i = 0; i < STRIP_COUNT; i\+\+\) render\(i\);/);
assert.doesNotMatch(body, /millis\(\) - lastFrame < EFFECT_FRAME/);

assert.match(fw, /showMatrix\(MATRIX_WIFI\);[\s\S]*WiFi\.begin/);
assert.match(fw, /wifiReported = true;[\s\S]*showMatrix\(MATRIX_OK\);/);
assert.match(fw, /showMatrix\(MATRIX_OTA\)/);

console.log('OK: V190 runtime rolled back');
console.log('OK: background NeoPixel transmission disabled');
console.log('OK: explicit forced static render retained');
console.log('OK: WiFi -> Matrix WIFI indicator contract retained');
console.log('OK: IP acquired -> Matrix OK indicator contract retained');
console.log('OK: OTA Matrix feedback retained');
