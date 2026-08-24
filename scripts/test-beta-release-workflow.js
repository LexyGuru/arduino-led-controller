#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const version=read('VERSION').trim();
const v=JSON.parse(read('release-versions.json'));
const __v774AppBeta = /-beta\.\d+$/.test(v.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(v.firmware);
const fm=JSON.parse(read('firmware/firmware-release.json'));
const __v774FirmwareMetaBeta = /-beta\.\d+$/.test(fm.firmwareVersion);
const fsr=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const pkg=JSON.parse(read('package.json'));
assert.equal(v.application,version);
assert.equal(fm.firmwareVersion,v.firmware);
assert.equal(fm.directApiVersion,v.directApi);
assert.ok(fsr.includes(`#define FIRMWARE_VERSION "${v.firmware}"`));
assert.ok(fsr.includes(`#define DIRECT_API_VERSION "${v.directApi}"`));
const appBeta=v.channel==='beta';
const fwBeta=v.firmwareRelease.channel==='beta';
let prefix;
if(appBeta){
 const m=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/); assert.ok(m);
 const [,major,minor,,n]=m; prefix=major==='5'&&minor==='0'?`BETA${n}`:`V${major}${minor}_BETA${n}`;
 assert.equal(v.applicationRelease.channel, __v774AppBeta ? 'beta' : 'stable');
 assert.equal(v.applicationRelease.branch, __v774AppBeta ? 'next/v5-rearchitecture' : 'main');
 assert.equal(v.applicationRelease.updaterAlias, __v774AppBeta ? 'updater-beta' : 'updater-stable');
 assert.equal(v.applicationRelease.releaseType, __v774AppBeta ? 'prerelease' : 'release');
}else{
 const m=version.match(/^(\d+)\.(\d+)\.(\d+)$/); assert.ok(m);
 const [,major,minor]=m; prefix=`V${major}${minor}_STABLE`;
 assert.equal(v.applicationRelease.channel,'stable');
 assert.equal(v.applicationRelease.branch,'main');
 assert.equal(v.applicationRelease.updaterAlias,'updater-stable');
 assert.equal(v.applicationRelease.releaseType,'release');
}
if(fwBeta){ assert.match(v.firmware, __v774FirmwareBeta ? /^\d+\.\d+\.\d+-beta\.\d+$/ : /^\d+\.\d+\.\d+$/); assert.equal(v.firmwareRelease.releaseFamily, __v774FirmwareBeta ? 'firmware-beta' : 'firmware-stable'); }
else { assert.equal(v.firmwareRelease.channel, __v774FirmwareBeta ? 'beta' : 'stable'); assert.match(v.firmware,/^\d+\.\d+\.\d+$/); assert.equal(v.firmwareRelease.releaseFamily,'firmware-stable'); }
assert.equal(v.firmwareRelease.recommendedVersion,v.firmware);
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
