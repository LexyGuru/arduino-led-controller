#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const release=JSON.parse(read('release-versions.json'));
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

// V6 documentation is semantically aligned, not byte-identical.
// Root release notes are the concise publication summary; docs/v5 release
// notes are the detailed technical release document.
for(const text of [notes,rootNotes]){
 assert.ok(text.includes('Language Pack Architecture 2.0'));
 assert.ok(text.includes('Hungarian'));
 assert.ok(text.includes('German'));
 assert.ok(text.includes('French'));
 assert.match(text,/Hungarian[\s\S]*1\.0\.0/);
 assert.match(text,/German[\s\S]*1\.0\.0/);
 assert.match(text,/French[\s\S]*pending/i);
}
assert.match(rootNotes,/Hungarian[\s\S]*published/i);
assert.match(rootNotes,/German[\s\S]*published/i);

assert.ok(currentState.includes(version));
assert.ok(currentState.includes(release.firmware));
assert.ok(changelog.startsWith(`# ${version} — `));
assert.match(readme,/## GitHub Actions és release-folyamat/);
console.log(`V625_CURRENT_IDENTITY=PASSED:${version}`);
console.log(`V625_CURRENT_DOC_PREFIX=PASSED:${docPrefix}`);
