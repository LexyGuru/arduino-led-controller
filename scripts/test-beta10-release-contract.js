'use strict';
const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('VERSION','utf8').trim();
const versions=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const fwMeta=JSON.parse(fs.readFileSync('firmware/firmware-release.json','utf8'));
const fw=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');

assert.equal(app,'5.0.0-beta.10');
assert.equal(versions.application,app);
assert.equal(versions.firmware,'5.0.0-beta.7');
assert.equal(versions.directApi,'1.0.0');
assert.equal(fwMeta.firmwareVersion,versions.firmware);
assert.equal(fwMeta.directApiVersion,versions.directApi);
assert.ok(fw.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`));
assert.ok(fw.includes('#define DIRECT_API_VERSION "1.0.0"'));
assert.ok(fw.includes('v191-matrix-neopixel-stable'));
assert.ok(fw.includes('if (!force) return;'));
assert.ok(!fw.includes('v190-neopixel-dirty-dwt-clock'));

for(const file of [
  'package.json','package-lock.json',
  'desktop-tauri/package.json','desktop-tauri/package-lock.json',
  'desktop-tauri/src-tauri/Cargo.toml','desktop-tauri/src-tauri/Cargo.lock',
  'desktop-tauri/src-tauri/tauri.conf.json','docs/api/openapi-v2.json'
]){
  assert.ok(fs.readFileSync(file,'utf8').includes(app),`${file}: app version mismatch`);
}

const notes=fs.readFileSync('RELEASE_NOTES_5.0.0-beta.10.md','utf8');
assert.ok(notes.includes('5.0.0-beta.7'));
assert.ok(notes.includes('animált WS2812 effektek'));
assert.ok(notes.includes('Matrix'));

console.log('BETA10_APPLICATION_VERSION_CONTRACT=PASSED');
console.log('FIRMWARE_BETA7_VERSION_CONTRACT=PASSED');
console.log('DIRECT_API_1_0_0_CONTRACT=PASSED');
console.log('V191_HARDWARE_BASELINE_CONTRACT=PASSED');
console.log('BETA10_RELEASE_NOTES_CONTRACT=PASSED');
