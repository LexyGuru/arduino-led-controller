#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const version=read('VERSION').trim();
const versions=JSON.parse(read('release-versions.json'));
assert.equal(versions.application,versionSsot.application);

const beta=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
const stable=version.match(/^(\d+)\.(\d+)\.(\d+)$/);
assert.ok(beta||stable,`Nem támogatott aktuális verzió: ${version}`);
const m=beta||stable;
const [,major,minor,,betaNumber]=m;
const docPrefix=beta
  ? (major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`)
  : `V${major}${minor}_STABLE`;

const structuralDocs=[
 'README.md','firmware/README.md','docs/firmware/FIRMWARE_4_3_0_BETA_1.md',
 'docs/firmware/DIRECT_API_V1.md','docs/firmware/EEPROM_STORAGE.md',
 'docs/firmware/OTA_UPDATE.md','docs/firmware/TESTING.md',
 'docs/v5/V5_IMPLEMENTATION_STATUS.md','docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
 'CHANGELOG.md','SECURITY.md','CONTRIBUTING.md'
];
for(const path of structuralDocs) assert.ok(fs.existsSync(path),`Hiányzó dokumentum: ${path}`);

const currentDocs=[
 'README.md','docs/v5/CURRENT_STATE.md',
 `docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`,
 `docs/v5/${docPrefix}_RELEASE_NOTES.md`,
 `docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`
];
for(const path of currentDocs) assert.ok(fs.existsSync(path),`Hiányzó aktuális dokumentum: ${path}`);

const currentText=currentDocs.map(read).join('\n');
for(const marker of [version,versions.firmware,'Direct API',versions.directApi])
 assert.ok(currentText.includes(marker),`Hiányzó aktuális dokumentációs marker: ${marker}`);

assert.doesNotMatch(read('README.md'),/firmware:\s*`4\.1\.21`/i);
console.log(`OK: current documentation contract — ${version} ${versions.channel} ${docPrefix}`);
