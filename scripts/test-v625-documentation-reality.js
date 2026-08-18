#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const match=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
assert.ok(match,`Unsupported current Beta version: ${version}`);
const [,major,minor,,betaNumber]=match;
const docPrefix=major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`;

const readme=read('README.md');
const notes=read(`docs/v5/${docPrefix}_RELEASE_NOTES.md`);
const rootNotes=read(`RELEASE_NOTES_${version}.md`);
const guide=read(`docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`);
const checklist=read(`docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`);
const changelog=read('CHANGELOG.md');
const currentState=read('docs/v5/CURRENT_STATE.md');
const release=JSON.parse(read('release-versions.json'));

assert.match(readme,/^# Arduino LED Controller V5\.6$/m);
assert.match(readme,/Jelenlegi Stable alkalmazás \(`main`\).*5\.1\.0/);
assert.match(readme,/Tervezett Stable promóció.*5\.6\.1/);
assert.match(readme,/Stable firmware.*jelenleg nincs publikálva.*5\.0\.0/);
assert.match(readme,/## GitHub Actions és kiadási architektúra/);
assert.doesNotMatch(readme,/## Mit tartalmaz a V5\.5\?/);
assert.ok(readme.includes(version));
assert.ok(readme.includes(`docs/v5/${docPrefix}_RELEASE_NOTES.md`));
assert.ok(readme.includes(`RELEASE_NOTES_${version}.md`));

for(const text of [notes,rootNotes,guide,checklist]){
  assert.ok(text.includes(version));
  assert.ok(text.includes(release.firmware));
  assert.ok(text.includes(release.directApi));
}
assert.equal(notes,rootNotes,'root and docs current release notes must stay identical');

assert.doesNotMatch(checklist,/beta-release\.yml legacy EXPECTED_VERSION/);
assert.match(checklist,/`beta-release\.yml` is absent/);
assert.match(checklist,/`tauri-desktop\.yml` is absent/);
assert.match(checklist,/`tauri-artifact-build\.yml` is absent/);
assert.match(checklist,/Application Beta release/);
assert.match(checklist,/Stable promotion gate/);

for(const text of [readme,notes,checklist]){
  assert.match(text,/app-beta-release\.yml|Application Beta release/);
  assert.match(text,/app-stable-release\.yml|Stable promotion/);
}
assert.match(guide,/Application and firmware releases are separate manual workflows/i);
assert.match(guide,/Stable promotion/i);

assert.ok(currentState.includes(version));
assert.ok(currentState.includes(release.firmware));
assert.match(currentState,/5\.1\.0/);
assert.match(currentState,/Stable firmware: jelenleg nincs publikálva/i);
assert.ok(changelog.startsWith(`# ${version} — `));

console.log(`V625_CURRENT_BETA_IDENTITY=PASSED:${version}`);
console.log(`V625_CURRENT_DOC_PREFIX=PASSED:${docPrefix}`);
console.log('V625_README_CURRENT_PRODUCT_IDENTITY=PASSED');
console.log('V625_ACTUAL_STABLE_BASELINE_DOCUMENTED=PASSED');
console.log('V625_CURRENT_RELEASE_DOCS_SYNCHRONIZED=PASSED');
console.log('V625_CANONICAL_WORKFLOW_DOCS=PASSED');
console.log('V625_BETA_TO_STABLE_PROMOTION_GATE_DOCUMENTED=PASSED');
