#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const r=JSON.parse(read('release-versions.json'));
const f=JSON.parse(read('firmware/firmware-release.json'));
const ino=read('firmware/ArduinoLedController/ArduinoLedController.ino');

assert.equal(read('VERSION').trim(),'5.6.1');
assert.equal(r.schemaVersion,2);
assert.equal(r.application,'5.6.1');
assert.equal(r.firmware,'5.0.0');
assert.equal(r.directApi,'1.0.0');
assert.equal(r.channel,'stable');
assert.deepEqual(
  {
    version:r.applicationRelease.version,
    channel:r.applicationRelease.channel,
    branch:r.applicationRelease.branch,
    updaterAlias:r.applicationRelease.updaterAlias,
    releaseType:r.applicationRelease.releaseType,
  },
  {
    version:'5.6.1',
    channel:'stable',
    branch:'main',
    updaterAlias:'updater-stable',
    releaseType:'release',
  }
);
assert.equal(r.firmwareRelease.recommendedVersion,'5.0.0');
assert.equal(r.firmwareRelease.channel,'stable');
assert.equal(r.firmwareRelease.available,true);
assert.equal(f.firmwareVersion,'5.0.0');
assert.equal(f.channel,'stable');
assert.equal(f.directApiVersion,'1.0.0');
assert.equal(f.binary,'Arduino_LED_Controller_Firmware_5.0.0_UNO_R4_WiFi.bin');
assert.equal(f.checksum,'Arduino_LED_Controller_Firmware_5.0.0_UNO_R4_WiFi.bin.sha256');
assert.match(ino,/#define FIRMWARE_VERSION "5\.0\.0"/);
assert.match(ino,/#define DIRECT_API_VERSION "1\.0\.0"/);

// Workflow internals are intentionally NOT duplicated here.
// The canonical repository workflow architecture tests own those contracts.
assert.equal(fs.existsSync('.github/workflows/app-stable-release.yml'),true);
assert.equal(fs.existsSync('.github/workflows/firmware-stable-release.yml'),true);

console.log('V635_STABLE_APP_5_6_1=PASSED');
console.log('V635_STABLE_FIRMWARE_5_0_0=PASSED');
console.log('V635_STABLE_UPDATER_ALIAS=PASSED');
console.log('V635_STABLE_METADATA_CONTRACT=PASSED');
