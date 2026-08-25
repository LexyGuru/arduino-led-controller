#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const wf=fs.readFileSync('.github/workflows/firmware-stable-release.yml','utf8');
const versions=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const meta=JSON.parse(fs.readFileSync('firmware/firmware-release.json','utf8'));
const ino=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');

assert.ok(wf.includes('FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_STABLE'));
assert.ok(wf.includes('uses: ./.github/workflows/firmware-build.yml'));
assert.equal(versions.channel,'stable');
assert.equal(versions.firmware,versionSsot.firmware);
assert.equal(meta.firmwareVersion,versionSsot.fixtures.firmwareStable500);
assert.equal(meta.channel,'stable');
versionSsot.assertFirmwareVersion(ino);
console.log('V651_STABLE_FIRMWARE_WORKFLOW_CHAIN=PASSED');
