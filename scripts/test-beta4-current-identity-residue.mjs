#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const TARGET='5.5.1-beta.4';
const STALE='5.5.1-beta.2';
const read=(p)=>fs.readFileSync(p,'utf8');
const json=(p)=>JSON.parse(read(p));
const esc=(value)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

assert.equal(read('VERSION').trim(),TARGET);
assert.equal(json('release-versions.json').application,TARGET);
assert.equal(json('package.json').version,TARGET);
assert.equal(json('desktop-tauri/package.json').version,TARGET);
assert.equal(json('web-lxc/package.json').version,TARGET);

const tauriApi=read('desktop-tauri/src/services/tauriApi.ts');
assert.match(
  tauriApi,
  new RegExp(`APP_VERSION\\s*=\\s*['"]${esc(TARGET)}['"]`)
);
assert.doesNotMatch(
  tauriApi,
  new RegExp(`APP_VERSION\\s*=\\s*['"]${esc(STALE)}['"]`)
);

const workflow=read('.github/workflows/beta-release.yml');
assert.match(workflow,new RegExp(`EXPECTED_VERSION:\\s*${esc(TARGET)}`));
assert.doesNotMatch(workflow,new RegExp(`EXPECTED_VERSION:\\s*${esc(STALE)}`));

const readme=read('README.md');
const currentStart=readme.indexOf('## Aktuális kiadás');
const historyStart=readme.indexOf('### Korábbi kiadási dokumentumok',currentStart);
assert.notEqual(currentStart,-1,'README current-release section missing');
assert.notEqual(historyStart,-1,'README historical boundary missing');
const currentSection=readme.slice(currentStart,historyStart);
assert.ok(currentSection.includes(TARGET));
assert.ok(!currentSection.includes(STALE),'stale Beta.2 leaked into current README section');
assert.ok(currentSection.includes('V55_BETA4_RELEASE_NOTES.md'));
assert.ok(currentSection.includes('V55_BETA4_INSTALLATION_GUIDE.md'));
assert.ok(currentSection.includes('V55_BETA4_RELEASE_CHECKLIST.md'));
assert.ok(currentSection.includes('RELEASE_NOTES_5.5.1-beta.4.md'));

// Verified actual scripts/test-v5-documentation-status.js source contract:
// assert.strictEqual(read('VERSION').trim(), 'x.y.z-beta.n');
// plus the first marker in: for (const marker of [ ... ])
const v5Status=read('scripts/test-v5-documentation-status.js');
assert.match(
  v5Status,
  new RegExp(
    `assert\\.strictEqual\\(read\\('VERSION'\\)\\.trim\\(\\),\\s*'${esc(TARGET)}'\\);`
  )
);
assert.match(
  v5Status,
  new RegExp(`for\\s*\\(const\\s+marker\\s+of\\s*\\[\\s*'${esc(TARGET)}',`)
);
assert.doesNotMatch(
  v5Status,
  new RegExp(
    `assert\\.strictEqual\\(read\\('VERSION'\\)\\.trim\\(\\),\\s*'${esc(STALE)}'\\);`
  )
);

// Verified actual scripts/test-beta7-documentation-current.js source contract:
// the first README-current marker is the application version.
const beta7Current=read('scripts/test-beta7-documentation-current.js');
assert.match(
  beta7Current,
  new RegExp(`for\\s*\\(const\\s+marker\\s+of\\s*\\[\\s*'${esc(TARGET)}',`)
);
assert.doesNotMatch(
  beta7Current,
  new RegExp(`for\\s*\\(const\\s+marker\\s+of\\s*\\[\\s*'${esc(STALE)}',`)
);

console.log('BETA4_CURRENT_IDENTITY_CANONICAL=PASSED');
console.log('BETA4_CURRENT_README_RESIDUE=ZERO');
console.log('BETA4_V5_DOC_STATUS_SEMANTIC_CONTRACT=PASSED');
console.log('BETA4_CURRENT_DOCUMENTATION_TEST_RESIDUE=ZERO');
console.log('BETA4_HISTORICAL_BETA2_REFERENCES=PRESERVABLE');
console.log('BETA4_CURRENT_IDENTITY_RESIDUE=PASSED');
