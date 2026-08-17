#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'); const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8'); const r=JSON.parse(read('release-versions.json'));
for(const f of ['app-beta-release.yml','app-stable-release.yml','firmware-beta-release.yml','firmware-stable-release.yml','app-build.yml','firmware-build.yml']) assert.ok(fs.existsSync('.github/workflows/'+f),'missing '+f);
const appBeta=read('.github/workflows/app-beta-release.yml'), legacy=read('.github/workflows/beta-release.yml'), appStable=read('.github/workflows/app-stable-release.yml'), fwBeta=read('.github/workflows/firmware-beta-release.yml'), fwStable=read('.github/workflows/firmware-stable-release.yml'), appBuild=read('.github/workflows/app-build.yml');
for(const t of [appBeta,legacy,appStable]){assert.doesNotMatch(t,/gh workflow run firmware-beta-release\.yml/);assert.doesNotMatch(t,/Dispatch and wait for dedicated firmware prerelease/)}
assert.match(appBeta,/EXPECTED_BRANCH: next\/v5-rearchitecture/); assert.match(appBeta,/prerelease: true/); assert.match(appBeta,/make_latest: false/); assert.match(fwBeta,/Build UNO R4 WiFi firmware/); assert.match(appStable,/GITHUB_REF_NAME/); assert.match(appStable,/updater-stable/); assert.match(fwStable,/No Stable firmware has been explicitly promoted/); assert.match(appBuild,/workflow_call:/);
if(r.applicationRelease.channel==='beta'){assert.equal(r.applicationRelease.branch,'next/v5-rearchitecture');assert.equal(r.firmwareRelease.channel,'beta')}else{assert.equal(r.applicationRelease.channel,'stable');assert.equal(r.applicationRelease.branch,'main');assert.equal(r.firmwareRelease.channel,'stable')}
console.log('CANONICAL_WORKFLOW_SET=PASSED'); console.log('APP_FIRMWARE_RELEASE_DISPATCH_COUPLING=REMOVED'); console.log('STABLE_FIRMWARE_PROMOTION_GUARD=PASSED'); console.log('RELEASE_WORKFLOW_ARCHITECTURE_FOUNDATION=PASSED');
