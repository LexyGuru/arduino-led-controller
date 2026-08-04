#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const full=fs.readFileSync('.github/workflows/beta-release.yml','utf8');
const fw=fs.readFileSync('.github/workflows/firmware-beta-release.yml','utf8');
assert.doesNotMatch(full,/build-firmware:/);
assert.doesNotMatch(full,/Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/);
assert.match(full,/Enforce application-only release assets/);
for(const job of ['build-desktop:','build-android:','build-ios:','build-lxc:','publish:']) assert.match(full,new RegExp(job));
assert.match(fw,/FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/);
assert.match(fw,/Migrate verified legacy firmware assets/);
assert.match(fw,/Generate authoritative firmware catalog/);
assert.match(fw,/Remove firmware assets from application releases after migration/);
assert.match(fw,/Azonos firmware assetnév eltérő tartalommal/);
assert.match(fw,/firmware-catalog\.json/);
assert.match(fw,/FIRMWARE-SHA256SUMS/);
assert.doesNotMatch(fw,/build-desktop:/);
console.log('OK: alkalmazásrelease és dedikált többverziós firmware BETA release teljes szétválasztása');
