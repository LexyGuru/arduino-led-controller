#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const body=fs.readFileSync('scripts/test-language-pack-publication-readiness-v802.js','utf8');

for(const token of [
  "path.join(outputRoot,'manifest.json')",
  "path.join(outputRoot,'language-packs','manifest.json')",
  'const packRoot=resolvePackRoot(output);',
  'path.join(packRoot,entry.file)',
  'manifest.schemaVersion,',
  "1,",
  'pack.schemaVersion,1',
  'pack.schemaVersion,manifest.schemaVersion',
  'V804J_PUBLICATION_REAL_LAYOUT_SCHEMA_V1=PASSED'
]){
  assert.ok(body.includes(token),token);
}

assert.ok(!body.includes("path.join(output,'manifest.json')"));
assert.ok(!body.includes('assert.equal(manifest.schemaVersion,2)'));

console.log('V804J_PUBLICATION_READINESS_SOURCE_CONTRACT=PASSED');
