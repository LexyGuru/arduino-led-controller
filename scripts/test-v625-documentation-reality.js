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

// Language Pack release truth comes from release-versions.json only.
const lp=release.languagePackRelease;
assert.ok(lp);
assert.equal(lp.architectureVersion,'2.1');
assert.equal(lp.catalogVersion,'2.1.0');
assert.equal(lp.totalLanguages,15);
assert.equal(lp.downloadableLanguages,14);
const languagePackDocs=[
 ['Hungarian','hu'],['German','de'],['French','fr'],['Spanish','es'],
 ['Italian','it'],['Portuguese','pt'],['Ukrainian','uk'],['Polish','pl'],
 ['Russian','ru'],['Czech','cs'],['Romanian','ro'],
 ['Simplified Chinese','zh-CN'],['Japanese','ja'],['Korean','ko']
];
for(const text of [notes,rootNotes]){
 assert.ok(text.includes(`Language Pack Architecture ${lp.architectureVersion}`));
 for(const [name,code] of languagePackDocs){
  assert.ok(text.includes(name),name);
  const escaped=lp.packs[code].version.replace(/\./g,'\\.');
  assert.match(text,new RegExp(name+'[\\s\\S]*'+escaped));
 }
 assert.ok(!/French[\s\S]*pending/i.test(text));
}

assert.ok(currentState.includes(version));
assert.ok(currentState.includes(release.firmware));
assert.ok(changelog.startsWith(`# ${version} — `));
assert.match(readme,/## GitHub Actions és release-folyamat/);
console.log(`V625_CURRENT_IDENTITY=PASSED:${version}`);
console.log(`V625_CURRENT_DOC_PREFIX=PASSED:${docPrefix}`);
