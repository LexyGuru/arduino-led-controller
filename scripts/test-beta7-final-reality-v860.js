#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const release=JSON.parse(read('release-versions.json'));
const workflow=read('.github/workflows/app-beta-release.yml');
const readme=read('README.md');
const contributing=read('CONTRIBUTING.md');
const security=read('SECURITY.md');

assert.equal(release.application,'6.0.0-beta.7');
assert.equal(release.firmware,'5.1.0-beta.4');
assert.equal(release.directApi,'1.2.0');

assert.doesNotMatch(workflow,/"directApiVersion":\s*"1\.0\.0"/);
assert.equal((workflow.match(/"directApiVersion": versions\["directApi"\]/g)||[]).length,2);

for(const marker of [
  'Arduino LED Controller 6.0.0-beta.7 — Performance & Observability',
  '| Magyar (`hu`) | **1.1.0 published** |',
  '| Deutsch (`de`) | **1.1.0 published** |',
  '| Français (`fr`) | **1.0.0 published** |',
  '| 日本語 (`ja`) | **1.0.0 published** |',
  '| 한국어 (`ko`) | **1.0.0 published** |',
  '15 támogatott nyelv',
  '14 letölthető csomag',
  '[Contributing](CONTRIBUTING.md)',
  '[Security](SECURITY.md)',
  'V60_BETA7_RELEASE_NOTES.md',
  'V60_BETA7_INSTALLATION_GUIDE.md',
  'V60_BETA7_RELEASE_CHECKLIST.md'
]) assert.ok(readme.includes(marker),marker);

assert.doesNotMatch(readme,/\| Français \(`fr`\) \| pending \|/);
assert.doesNotMatch(readme,/Application 6\.0\.0-beta\.1/);
assert.doesNotMatch(readme,/next\/v5-rearchitecture \/ 6\.0\.0-beta\.1/);
assert.doesNotMatch(readme,/\[Contributing , Security\]\([^)]*#\)/);

for(const marker of ['6.0.0-beta.7','5.1.0-beta.4','1.2.0','next/v5-rearchitecture','language-packs'])
  assert.ok(contributing.includes(marker),`CONTRIBUTING ${marker}`);
assert.doesNotMatch(contributing,/feature\/beta7-ui-overhaul/);
assert.doesNotMatch(contributing,/5\.0\.0-beta\.7/);

for(const marker of ['6.0.0-beta.7','5.1.0-beta.4','1.2.0','Structured logging'])
  assert.ok(security.includes(marker),`SECURITY ${marker}`);
assert.doesNotMatch(security,/\| `5\.0\.0-beta\.6` \| aktívan támogatott beta \|/);

console.log('V860_RELEASE_METADATA_DIRECT_API_SSOT=PASSED');
console.log('V860_README_15_LANGUAGE_REALITY=PASSED');
console.log('V860_README_CURRENT_DOCS=PASSED');
console.log('V860_CONTRIBUTING_REALITY=PASSED');
console.log('V860_SECURITY_REALITY=PASSED');
console.log('V860_FINAL_REALITY_CONTRACT=PASSED');
