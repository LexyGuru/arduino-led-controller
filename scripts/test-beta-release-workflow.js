#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const version=read('VERSION').trim();
const v=JSON.parse(read('release-versions.json'));
const fm=JSON.parse(read('firmware/firmware-release.json'));
const fsr=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const pkg=JSON.parse(read('package.json'));
assert.equal(v.application,versionSsot.application);
assert.equal(fm.firmwareVersion,v.firmware);
assert.equal(fm.directApiVersion,v.directApi);
versionSsot.assertFirmwareVersion(fsr);
versionSsot.assertFirmwareDirectApi(fsr);
const appBeta=v.channel==='beta';
const fwBeta=v.firmwareRelease.channel==='beta';
let prefix;
if(appBeta){
 const m=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/); assert.ok(m);
 const [,major,minor,,n]=m; prefix=major==='5'&&minor==='0'?`BETA${n}`:`V${major}${minor}_BETA${n}`;
 assert.equal(v.applicationRelease.channel,'beta');
 assert.equal(v.applicationRelease.branch,'next/v5-rearchitecture');
 assert.equal(v.applicationRelease.updaterAlias,'updater-beta');
 assert.equal(v.applicationRelease.releaseType,'prerelease');
}else{
 const m=version.match(/^(\d+)\.(\d+)\.(\d+)$/); assert.ok(m);
 const [,major,minor]=m; prefix=`V${major}${minor}_STABLE`;
 assert.equal(v.applicationRelease.channel,'stable');
 assert.equal(v.applicationRelease.branch,'main');
 assert.equal(v.applicationRelease.updaterAlias,'updater-stable');
 assert.equal(v.applicationRelease.releaseType,'release');
}
if(fwBeta){ assert.match(v.firmware,/^\d+\.\d+\.\d+-beta\.\d+$/); assert.equal(v.firmwareRelease.releaseFamily,'firmware-beta'); }
else { assert.equal(v.firmwareRelease.channel, 'beta'); assert.match(v.firmware,/^\d+\.\d+\.\d+$/); assert.equal(v.firmwareRelease.releaseFamily,'firmware-stable'); }
assert.equal(v.firmwareRelease.recommendedVersion,versionSsot.firmware);
for(const k of ['INSTALLATION_GUIDE','RELEASE_NOTES','RELEASE_CHECKLIST']) assert.equal(fs.existsSync(`docs/v5/${prefix}_${k}.md`),true);
const aw=read(appBeta?'.github/workflows/app-beta-release.yml':'.github/workflows/app-stable-release.yml');
const fw=read(fwBeta?'.github/workflows/firmware-beta-release.yml':'.github/workflows/firmware-stable-release.yml');
assert.match(aw,/workflow_dispatch:/); assert.doesNotMatch(aw,/\n  push:/); assert.match(aw,/npm test/); assert.match(aw,/validate-repository\.sh/);
assert.equal(pkg.scripts['test:beta-installation-assets'],'node scripts/test-v55-current-release-contract-v334.js && node scripts/test-v55-staging-runtime-normalization-v334.js');
if(appBeta){ assert.match(aw,/npm run test:beta-installation-assets/); assert.match(aw,/prerelease: true/); assert.match(aw,/make_latest: false/); }
else { assert.match(aw,/make_latest: true/); }
assert.match(fw,/workflow_dispatch:/); assert.match(fw,/uses: \.\/\.github\/workflows\/firmware-build\.yml/); assert.match(fw,/firmware-catalog\.json/);
if(fwBeta){ assert.match(fw,/FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/); }
else { assert.match(fw,/FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_STABLE/); assert.match(fw,/firmwareRelease\.recommendedVersion/); }
console.log(`APPLICATION_CHANNEL=${v.channel}`);
console.log(`FIRMWARE_CHANNEL=${v.firmwareRelease.channel}`);
console.log('RELEASE_WORKFLOW_CHANNEL_DECOUPLING=PASSED');
