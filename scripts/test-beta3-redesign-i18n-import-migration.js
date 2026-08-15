#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src='desktop-tauri/src';
const runtimeSymbols=new Set([
  'translate',
  'AppLanguage',
  'languageOptions',
  'translationDictionaries'
]);

const importRe=/import\s+(?:type\s+)?\{\s*([^}]*)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?/gs;
const importedName=(spec)=>{
  let v=spec.trim();
  if(v.startsWith('type ')) v=v.slice(5).trim();
  return v.split(/\s+as\s+/)[0].trim();
};

const residual=[];
const runtimeHits=[];

function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    const stat=fs.statSync(p);
    if(stat.isDirectory()) walk(p);
    else if(/\.(?:ts|tsx)$/.test(name)){
      const text=fs.readFileSync(p,'utf8');
      for(const match of text.matchAll(importRe)){
        const module=match[2];
        const specs=match[1].split(',').map(s=>s.trim()).filter(Boolean);
        const runtime=specs.filter(s=>runtimeSymbols.has(importedName(s)));
        if(!runtime.length) continue;
        if(module.endsWith('/i18n/runtime') || module === './runtime'){
          runtimeHits.push(`${p}:${runtime.map(importedName).join(',')}`);
        }else if(module === './i18n' || module.endsWith('/i18n')){
          residual.push(`${p}:${runtime.map(importedName).join(',')}`);
        }
      }
    }
  }
}
walk(src);

assert.equal(
  residual.length,
  0,
  `non-React i18n imports still use React barrel: ${residual.join('|')}`
);

for(const rel of [
  'hooks/useController.ts',
  'hooks/useV5Firmware.ts',
  'hooks/useV5Leds.ts',
  'hooks/useV5Logs.ts',
  'hooks/useV5Schedules.ts',
  'hooks/useV5System.ts',
  'utils/firmwareOtaLocalization.ts'
]){
  const text=fs.readFileSync(path.join(src,rel),'utf8');
  assert.ok(
    text.includes('i18n/runtime'),
    `${rel} must import non-React i18n API from runtime`
  );
}

const boundary=fs.readFileSync(
  'desktop-tauri/src/i18n/index.tsx','utf8'
);
assert.ok(boundary.includes('export function I18nProvider'));
assert.ok(boundary.includes('export function useI18n'));
assert.ok(!boundary.includes('export function translate('));
assert.ok(!boundary.includes('export const languageOptions'));
assert.ok(!boundary.includes('export const translationDictionaries'));
assert.ok(!boundary.includes('export type AppLanguage'));

assert.ok(runtimeHits.length >= 7);

console.log('BETA3_REDESIGN_NON_REACT_I18N_IMPORTS_RUNTIME=PASSED');
console.log('BETA3_REDESIGN_I18N_IMPORT_RESIDUAL=ZERO');
console.log('BETA3_REDESIGN_REACT_BOUNDARY_EXPORT_SCOPE=PASSED');
console.log('BETA3_REDESIGN_I18N_IMPORT_MIGRATION=PASSED');
