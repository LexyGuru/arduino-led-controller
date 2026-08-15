#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const scripts='scripts';
const oldPath='desktop-tauri/src/i18n/index.tsx';
const runtimePath='desktop-tauri/src/i18n/runtime.ts';
const parityTokens=[
  'hu/en/de parity',
  'i18n parity',
  'expected 3',
  'expected three',
  'parity failed'
];

const residual=[];
for(const name of fs.readdirSync(scripts)){
  if(!/\.(?:c?js|mjs)$/.test(name)) continue;
  const text=fs.readFileSync(path.join(scripts,name),'utf8');
  const lower=text.toLowerCase();
  if(!text.includes(oldPath)) continue;
  if(!parityTokens.some(token=>lower.includes(token))) continue;

  const direct=/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:(?:fs\.)?readFileSync|read)\s*\(\s*['"]desktop-tauri\/src\/i18n\/index\.tsx['"]/gs;
  const prop=/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*(?:(?:fs\.)?readFileSync|read)\s*\(\s*['"]desktop-tauri\/src\/i18n\/index\.tsx['"]/gs;

  for(const re of [direct,prop]){
    for(const match of text.matchAll(re)){
      const n=match[1];
      const counted=
        new RegExp(`\\b${n}\\s*\\.\\s*(?:match|split)\\s*\\(`).test(text) ||
        new RegExp(`\\.\\s*${n}\\s*\\.\\s*(?:match|split)\\s*\\(`).test(text);
      if(counted) residual.push(`${name}:${n}`);
    }
  }
}

assert.equal(
  residual.length,
  0,
  `legacy parity dataflow remains: ${residual.join('|')}`
);

for(const name of [
  'test-beta2-contract.js',
  'test-beta7-theme-audit-console.js'
]){
  const text=fs.readFileSync(path.join(scripts,name),'utf8');
  assert.ok(text.includes(runtimePath),`${name} must use runtime dictionary source`);
}

const foundation=fs.readFileSync(
  'scripts/test-beta3-redesign-foundation.mjs','utf8'
);
assert.ok(foundation.includes(oldPath));
assert.ok(foundation.includes("i18n.includes('I18nProvider')"));

console.log('BETA3_REDESIGN_I18N_PARITY_DATAFLOW_RESIDUAL=ZERO');
console.log('BETA3_REDESIGN_BETA2_PARITY_RUNTIME_SOURCE=PASSED');
console.log('BETA3_REDESIGN_BETA7_PARITY_RUNTIME_SOURCE=PASSED');
console.log('BETA3_REDESIGN_FOUNDATION_REACT_BOUNDARY_PRESERVED=PASSED');
console.log('BETA3_REDESIGN_I18N_DATAFLOW_CONSOLIDATION=PASSED');
