#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const scripts='scripts';
const oldPath='desktop-tauri/src/i18n/index.tsx';
const runtimePath='desktop-tauri/src/i18n/runtime.ts';
const boundaryTokens=[
  'I18nProvider',
  'useI18n',
  'translationDictionaries',
  'languageOptions',
  'I18nContext',
  'translateFor',
  'detectLanguage',
  'setActiveLanguage'
];

const residual=[];
for(const name of fs.readdirSync(scripts)){
  if(!/\.(?:c?js|mjs)$/.test(name)) continue;
  const text=fs.readFileSync(path.join(scripts,name),'utf8');
  if(!text.includes(oldPath)) continue;
  if(boundaryTokens.some(token=>text.includes(token))) continue;
  residual.push(name);
}
assert.equal(
  residual.length,
  0,
  `legacy literal dictionary source remains: ${residual.join('|')}`
);

const desktopV5=fs.readFileSync(
  'scripts/test-desktop-v5-ui-contract.js',
  'utf8'
);
assert.ok(desktopV5.includes(runtimePath));
assert.ok(!desktopV5.includes(oldPath));
for(const label of [
  'DIRECT MODE PROFIL',
  'Kapcsolat és hitelesítés',
  'FIRMWARE ÉS OTA',
  'FRISSÍTÉSEK'
]){
  assert.ok(desktopV5.includes(label),`desktop V5 literal contract missing: ${label}`);
}

const foundation=fs.readFileSync(
  'scripts/test-beta3-redesign-foundation.mjs',
  'utf8'
);
assert.ok(foundation.includes(oldPath));
assert.ok(foundation.includes("i18n.includes('I18nProvider')"));

console.log('BETA3_REDESIGN_I18N_LITERAL_CONTRACT_RESIDUAL=ZERO');
console.log('BETA3_REDESIGN_DESKTOP_V5_DICTIONARY_RUNTIME_SOURCE=PASSED');
console.log('BETA3_REDESIGN_REACT_BOUNDARY_LITERAL_AUDIT=PASSED');
console.log('BETA3_REDESIGN_I18N_LITERAL_CONTRACT_CONSOLIDATION=PASSED');
