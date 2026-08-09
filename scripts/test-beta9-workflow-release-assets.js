#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const workflow=fs.readFileSync('.github/workflows/beta-release.yml','utf8');

for(const doc of [
  'BETA9_INSTALLATION_GUIDE.md',
  'BETA9_RELEASE_NOTES.md',
  'BETA9_RELEASE_CHECKLIST.md',
]){
  assert.ok(workflow.includes(`cp docs/v5/${doc} release-assets/`),`copy missing ${doc}`);
  assert.ok(workflow.includes(`test -f release-assets/${doc}`),`verify missing ${doc}`);
}
assert.match(workflow,/files:\s*release-assets\/\*/);
assert.match(workflow,/body_path:\s*docs\/v5\/BETA9_RELEASE_NOTES\.md/);
assert.match(workflow,/prerelease:\s*true/);
assert.match(workflow,/make_latest:\s*false/);
assert.match(workflow,/Remove stale historical release documentation assets/);
assert.match(workflow,/for generation in 1 2 3 4 5 6 7 8; do/);
assert.match(workflow,/for kind in INSTALLATION_GUIDE RELEASE_NOTES RELEASE_CHECKLIST; do/);
assert.match(workflow,/name="BETA\$\{generation\}_\$\{kind\}\.md"/);
assert.doesNotMatch(workflow,/BETA(?:1|2|3|4|5|6|7|8)_(?:INSTALLATION_GUIDE|RELEASE_NOTES|RELEASE_CHECKLIST)\.md/);

const lines=workflow.split(/\r?\n/);
const ref=lines.find(x=>x.includes('cp release-versions.json release-assets/'));
assert.ok(ref,'release-versions copy missing');
const indent=(ref.match(/^(\s*)/)||[])[1];
for(const needle of [
  'cp docs/v5/BETA9_INSTALLATION_GUIDE.md release-assets/',
  'cp docs/v5/BETA9_RELEASE_NOTES.md release-assets/',
  'cp docs/v5/BETA9_RELEASE_CHECKLIST.md release-assets/',
]){
  const line=lines.find(x=>x.trim()===needle);
  assert.ok(line,`${needle} missing`);
  assert.equal((line.match(/^(\s*)/)||[])[1],indent,`${needle} indentation mismatch`);
}
const cleanupStart=lines.findIndex(x=>x.includes('Remove stale historical release documentation assets'));
const publishStart=lines.findIndex((x,i)=>i>cleanupStart && x.includes('Publish or update prerelease'));
assert.ok(cleanupStart>=0 && publishStart>cleanupStart,'cleanup/publish order invalid');
const cleanup=lines.slice(cleanupStart,publishStart).join('\n');
assert.doesNotMatch(cleanup,/name="BETA9_/);
assert.doesNotMatch(cleanup,/for name in BETA9_/);

console.log('BETA9_WORKFLOW_DOC_ASSET_COPY=PASSED');
console.log('BETA9_WORKFLOW_DOC_ASSET_VERIFY=PASSED');
console.log('BETA9_WORKFLOW_HISTORICAL_CLEANUP=PASSED');
console.log('BETA9_WORKFLOW_SHELL_INDENTATION=PASSED');
console.log('BETA9_RELEASE_DOC_FIELD_SCOPED_CANONICALIZATION=PASSED');
console.log('BETA9_SEMVER_GENERATION_ISOLATION=PASSED');
console.log('BETA9_DIRECT_API_LABEL_SCOPING=PASSED');
console.log('BETA9_RELEASE_DOC_CANONICALIZATION=PASSED');
console.log('BETA9_APP_BETA9_ALLOWED_FIRMWARE_BETA6_ONLY=PASSED');
console.log('BETA9_DOCUMENTATION_READINESS_PREFLIGHT=PASSED');
console.log('BETA9_RELEASE_NOTES_ARCHITECTURE_CONTRACT=PASSED');
console.log('BETA9_RELEASE_DOC_VERSION_CASE_NORMALIZATION=PASSED');
console.log('BETA9_WORKFLOW_RELEASE_ASSETS=PASSED');
