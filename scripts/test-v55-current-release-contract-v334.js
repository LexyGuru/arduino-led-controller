#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const release=JSON.parse(read('release-versions.json'));
const isBeta=release.channel==='beta';
const m=version.match(/^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/);
assert.ok(m,`Cannot derive current release identity from ${version}`);
const [,major,minor,,betaNumber]=m;
const docPrefix=isBeta
 ? (major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`)
 : `V${major}${minor}_STABLE`;

assert.equal(release.application,versionSsot.application);
assert.equal(release.applicationRelease.version,versionSsot.application);
assert.equal(release.applicationRelease.channel,release.channel);
assert.equal(release.applicationRelease.branch,isBeta?'next/v5-rearchitecture':'main');
assert.equal(release.applicationRelease.updaterAlias,isBeta?'updater-beta':'updater-stable');

for(const kind of ['INSTALLATION_GUIDE','RELEASE_NOTES','RELEASE_CHECKLIST']){
 const path=`docs/v5/${docPrefix}_${kind}.md`;
 assert.equal(fs.existsSync(path),true,path);
 assert.ok(read(path).includes(version),path);
}
console.log(`CURRENT_RELEASE_CONTRACT=PASSED:${version}:${release.channel}:${docPrefix}`);
