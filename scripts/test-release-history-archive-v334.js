#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');

const history = [
  ['docs/v5/BETA3_RELEASE_NOTES.md', '5.0.0-beta.3'],
  ['docs/v5/BETA4_RELEASE_NOTES.md', '5.0.0-beta.4'],
  ['docs/v5/BETA8_RELEASE_NOTES.md', '5.0.0-beta.8'],
  ['docs/v5/BETA9_RELEASE_NOTES.md', '5.0.0-beta.9'],
  ['docs/v5/BETA10_RELEASE_NOTES.md', '5.0.0-beta.10']
];

for (const [file, version] of history) {
  assert.ok(fs.existsSync(file), `Missing historical release document: ${file}`);
  assert.ok(read(file).includes(version), `${file} does not preserve ${version}`);
}

assert.equal(read('VERSION').trim(), '5.5.0-beta.1');
assert.ok(fs.existsSync('docs/v5/V55_BETA1_RELEASE_NOTES.md'));
assert.ok(
  read('docs/v5/V55_BETA1_RELEASE_NOTES.md').includes('5.5.0-beta.1')
);

for (const [file] of history) {
  assert.doesNotMatch(
    read(file),
    /5\.5\.0-beta\.1/,
    `${file} was overwritten with the current release version`
  );
}

console.log('HISTORICAL_RELEASE_DOCUMENTS=PRESERVED');
console.log('CURRENT_RELEASE_SEPARATED_FROM_HISTORY=PASSED');
