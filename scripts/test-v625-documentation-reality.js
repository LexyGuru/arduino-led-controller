#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const readme=read('README.md');
const notes=read('docs/v5/V56_BETA1_RELEASE_NOTES.md');
const rootNotes=read('RELEASE_NOTES_5.6.1-beta.1.md');
const guide=read('docs/v5/V56_BETA1_INSTALLATION_GUIDE.md');
const checklist=read('docs/v5/V56_BETA1_RELEASE_CHECKLIST.md');
const changelog=read('CHANGELOG.md');
const currentState=read('docs/v5/CURRENT_STATE.md');

assert.match(readme,/^# Arduino LED Controller V5\.6$/m);
assert.match(readme,/Jelenlegi Stable alkalmazás \(`main`\).*5\.1\.0/);
assert.match(readme,/Tervezett Stable promóció.*5\.6\.1/);
assert.match(readme,/Stable firmware.*jelenleg nincs publikálva.*5\.0\.0/);
assert.match(readme,/## GitHub Actions és kiadási architektúra/);
assert.doesNotMatch(readme,/## Mit tartalmaz a V5\.5\?/);

for(const text of [notes,rootNotes,guide,checklist]){
  assert.match(text,/5\.6\.1-beta\.1/);
  assert.match(text,/5\.0\.0-beta\.10/);
  assert.match(text,/1\.0\.0/);
}
assert.equal(notes,rootNotes,'root and docs current release notes must stay identical');

assert.doesNotMatch(checklist,/beta-release\.yml legacy EXPECTED_VERSION/);
assert.match(checklist,/`beta-release\.yml` is absent/);
assert.match(checklist,/`tauri-desktop\.yml` is absent/);
assert.match(checklist,/`tauri-artifact-build\.yml` is absent/);
assert.match(checklist,/Application Beta release/);
assert.match(checklist,/Stable promotion gate/);

// Workflow filenames belong in architecture/release documents; the installation
// guide only needs to describe the release separation and promotion semantics.
for(const text of [readme,notes,checklist]){
  assert.match(text,/app-beta-release\.yml|Application Beta release/);
  assert.match(text,/app-stable-release\.yml|Stable promotion/);
}
assert.match(guide,/Application and firmware releases are separate manual workflows/);
assert.match(guide,/Stable promotion/);

assert.match(currentState,/5\.6\.1-beta\.1/);
assert.match(currentState,/5\.0\.0-beta\.10/);
assert.match(currentState,/5\.1\.0/);
assert.match(currentState,/Stable firmware: jelenleg nincs publikálva/i);
assert.match(changelog,/^# 5\.6\.1-beta\.1 — 2026-08-18/);
assert.match(changelog,/Current Stable application before promotion: `5\.1\.0`/);

console.log('V625_README_CURRENT_PRODUCT_IDENTITY=PASSED');
console.log('V625_ACTUAL_STABLE_BASELINE_DOCUMENTED=PASSED');
console.log('V625_CURRENT_RELEASE_DOCS_SYNCHRONIZED=PASSED');
console.log('V625_CANONICAL_WORKFLOW_DOCS=PASSED');
console.log('V625_BETA_TO_STABLE_PROMOTION_GATE_DOCUMENTED=PASSED');
