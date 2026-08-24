#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const release=JSON.parse(read('release-versions.json'));
const __v774AppBeta = /-beta\.\d+$/.test(release.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(release.firmware);
const isBeta=release.channel==='beta';
const m=version.match(/^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/);
assert.ok(m,version);
const [,major,minor,,betaNumber]=m;
const docPrefix=isBeta
 ? (major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`)
 : `V${major}${minor}_STABLE`;

const readme=read('README.md');
const notes=read(`docs/v5/${docPrefix}_RELEASE_NOTES.md`);
const rootNotes=read(`RELEASE_NOTES_${version}.md`);
const guide=read(`docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`);
const checklist=read(`docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`);
const currentState=read('docs/v5/CURRENT_STATE.md');
const changelog=read('CHANGELOG.md');

assert.ok(readme.includes(version));
assert.ok(readme.includes(`docs/v5/${docPrefix}_RELEASE_NOTES.md`));
assert.ok(readme.includes(`RELEASE_NOTES_${version}.md`));
for(const text of [notes,rootNotes,guide,checklist]){
 assert.ok(text.includes(version));
 assert.ok(text.includes(release.firmware));
 assert.ok(text.includes(release.directApi));
}
assert.equal(notes,rootNotes);
assert.ok(currentState.includes(version));
assert.ok(currentState.includes(release.firmware));
assert.ok(changelog.startsWith(`# ${version} — `));
assert.match(readme,/## GitHub Actions és kiadási architektúra/);
console.log(`V625_CURRENT_IDENTITY=PASSED:${version}`);
console.log(`V625_CURRENT_DOC_PREFIX=PASSED:${docPrefix}`);
