#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const wf=fs.readFileSync('.github/workflows/app-stable-release.yml','utf8');
const publish=wf.slice(wf.indexOf('  publish:'));

for(const token of [
  'EXPECTED_VERSION: ${{ needs.validate.outputs.version }}',
  'verify-stable-release-assets-v650.js',
  'generate-stable-tauri-updater-feed-v650.js',
  'generate-stable-release-metadata-v650.js',
  '--phase stable',
  '--target-version "${{ needs.validate.outputs.version }}"',
  '--dependency-install "npm-ci"',
  'gh release edit updater-stable',
  '--prerelease=false'
]){
  assert.ok(publish.includes(token),token);
}
for(const token of [
  "r.application!==process.env.EXPECTED_VERSION",
  '"channel": "beta"',
  '--phase beta',
  'latest-beta.json'
]){
  assert.ok(!publish.includes(token),token);
}
console.log('V651_STABLE_WORKFLOW_REWRITE_CONTRACT=PASSED');
