#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const versions=JSON.parse(read('release-versions.json'));
const firmwareMeta=JSON.parse(read('firmware/firmware-release.json'));
const firmwareSource=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const isBeta=versions.channel==='beta';
const isStable=versions.channel==='stable';

assert.equal(versions.application,version);
assert.ok(isBeta||isStable,`Unsupported current channel: ${versions.channel}`);
assert.equal(versions.applicationRelease.channel,versions.channel);
assert.equal(versions.applicationRelease.branch,isBeta?'next/v5-rearchitecture':'main');
assert.equal(versions.applicationRelease.updaterAlias,isBeta?'updater-beta':'updater-stable');
assert.equal(firmwareMeta.firmwareVersion,versions.firmware);
assert.equal(firmwareMeta.directApiVersion,versions.directApi);
assert.ok(firmwareSource.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`));
assert.ok(firmwareSource.includes(`#define DIRECT_API_VERSION "${versions.directApi}"`));

if(isBeta){
 assert.match(version,/^\d+\.\d+\.\d+-beta\.\d+$/);
 assert.match(versions.firmware,/^\d+\.\d+\.\d+-beta\.\d+$/);
 assert.equal(fs.existsSync('.github/workflows/app-beta-release.yml'),true);
 assert.equal(fs.existsSync('.github/workflows/firmware-beta-release.yml'),true);
 assert.equal(versions.applicationRelease.releaseType,'prerelease');
} else {
 assert.match(version,/^\d+\.\d+\.\d+$/);
 assert.match(versions.firmware,/^\d+\.\d+\.\d+$/);
 assert.equal(fs.existsSync('.github/workflows/app-stable-release.yml'),true);
 assert.equal(fs.existsSync('.github/workflows/firmware-stable-release.yml'),true);
 assert.equal(versions.applicationRelease.releaseType,'release');
 assert.equal(versions.firmwareRelease.channel,'stable');
 assert.equal(versions.firmwareRelease.available,true);
}

// Detailed workflow source contracts are owned by the canonical architecture tests.
// This current test only verifies that metadata selects the correct workflow family.
console.log(`CURRENT_RELEASE_WORKFLOW_FAMILY=PASSED:${versions.channel}`);
console.log(`CURRENT_APPLICATION_RELEASE=PASSED:${versions.application}`);
console.log(`CURRENT_FIRMWARE_RELEASE=PASSED:${versions.firmware}`);
