#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const release=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const meta=JSON.parse(fs.readFileSync('firmware/firmware-release.json','utf8'));
const fw=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');

assert.equal(release.application,'6.0.0-beta.7');
assert.equal(release.firmware,'5.1.0-beta.4');
assert.equal(release.directApi,'1.2.0');
assert.equal(release.firmwareRelease.recommendedVersion,release.firmware);
assert.equal(release.directApiRelease.version,release.directApi);
assert.equal(meta.firmwareVersion,release.firmware);
assert.equal(meta.channel,release.firmwareRelease.channel);
assert.equal(meta.board,release.board);
assert.equal(meta.directApiVersion,release.directApi);
assert.equal(meta.otaPort,release.otaPort);
assert.ok(fw.includes(`#define FIRMWARE_VERSION "${release.firmware}"`));
assert.ok(fw.includes(`#define DIRECT_API_VERSION "${release.directApi}"`));

const checker=fs.readFileSync('scripts/check-versions.py','utf8');
for(const marker of [
  'read_firmware_release_metadata',
  'firmware/firmware-release.json.firmwareVersion',
  'firmware/ArduinoLedController.ino.FIRMWARE_VERSION',
  'firmware/firmware-release.json.directApiVersion',
  'firmware/ArduinoLedController.ino.DIRECT_API_VERSION',
  'staging_surfaces',
  'deploy/staging.env.example.RELEASE_TARGET_VERSION',
  'deploy/staging.env.example.RELEASE_CANDIDATE'
]) assert.ok(checker.includes(marker),marker);

assert.ok(checker.includes('Kanonikus projektverzió'));
assert.ok(checker.includes('Kanonikus firmware verzió'));
assert.ok(checker.includes('Kanonikus Direct API verzió'));
assert.ok(checker.includes('Kanonikus staging RELEASE_TARGET_VERSION'));
assert.ok(checker.includes('Kanonikus staging RELEASE_CANDIDATE'));

console.log('V858E_APPLICATION_SSOT=PASSED');
console.log('V858E_FIRMWARE_SSOT=PASSED');
console.log('V858E_DIRECT_API_SSOT=PASSED');
console.log('V858E_FIRMWARE_RELEASE_METADATA=PASSED');
console.log('V858E_COMPLETE_VERSION_GATE=PASSED');
