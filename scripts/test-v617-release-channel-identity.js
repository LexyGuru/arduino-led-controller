#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const release=JSON.parse(read('release-versions.json'));
const isBeta=/-beta\.\d+$/.test(version);
const isStable=/^\d+\.\d+\.\d+$/.test(version);
assert.ok(isBeta||isStable,`Unsupported release version: ${version}`);
const m=version.match(/^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/);
const [,major,minor,,betaNumber]=m;
const docPrefix=isBeta
  ? (major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`)
  : `V${major}${minor}_STABLE`;

assert.equal(release.application,versionSsot.application);
assert.equal(release.applicationRelease.version,versionSsot.application);
assert.equal(release.channel,isBeta?'beta':'stable');
assert.equal(release.applicationRelease.channel,release.channel);
assert.equal(release.applicationRelease.branch,isBeta?'next/v5-rearchitecture':'main');
assert.equal(release.applicationRelease.updaterAlias,isBeta?'updater-beta':'updater-stable');

for(const p of [
 `RELEASE_NOTES_${version}.md`,
 `docs/v5/${docPrefix}_RELEASE_NOTES.md`,
 `docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`,
 `docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`
]) assert.equal(fs.existsSync(p),true,p);

const workflowPath=isBeta?'.github/workflows/app-beta-release.yml':'.github/workflows/app-stable-release.yml';
assert.equal(fs.existsSync(workflowPath),true,workflowPath);

const panel=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const fwPage=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const i18n=read('desktop-tauri/src/i18n/runtime.ts');
assert.match(panel,/function channelFromVersion/);
assert.match(panel,/channelIdentity\.appMismatch/);
assert.match(panel,/channelIdentity\.firmwareMismatch/);
assert.match(fwPage,/const selectedFirmwareChannel = firmwareUpdateChannel/);
for(const key of ['channelIdentity.buildType','channelIdentity.updateChannel','channelIdentity.appMismatch','channelIdentity.firmwareMismatch'])
 assert.equal((i18n.match(new RegExp(key.replaceAll('.','\\.'),'g'))||[]).length,3);

console.log(`V617_CURRENT_APP_VERSION=PASSED:${version}`);
console.log(`V617_CURRENT_CHANNEL=PASSED:${release.channel}`);
console.log(`V617_CURRENT_RELEASE_DOC_PREFIX=PASSED:${docPrefix}`);
