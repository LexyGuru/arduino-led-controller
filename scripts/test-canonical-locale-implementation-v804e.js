#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const srcRoot=path.join(root,'desktop-tauri/src');
const implementations=[];

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(/\.(ts|tsx)$/.test(entry.name)){
      const rel=path.relative(root,full);
      const source=fs.readFileSync(full,'utf8');
      if(/function localeForLanguage\(/.test(source)) implementations.push(rel);
    }
  }
}

walk(srcRoot);
implementations.sort();
assert.deepEqual(
  implementations,
  ['desktop-tauri/src/i18n/locale.ts']
);

const runtime=fs.readFileSync('desktop-tauri/src/i18n/runtime.ts','utf8');
const firmware=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
assert.match(runtime,/export \{ localeForLanguage \} from '\.\/locale'/);
assert.match(firmware,/import \{ localeForLanguage \} from '\.\.\/i18n\/runtime'/);
assert.doesNotMatch(firmware,/function localeForLanguage\(/);

console.log('V804J_CANONICAL_LOCALE_IMPLEMENTATION_EXACTLY_ONE=PASSED');
console.log('V804J_CANONICAL_LOCALE_IMPLEMENTATION_PATH=PASSED');
console.log('V804J_NO_PAGE_LOCAL_LOCALE_IMPLEMENTATION=PASSED');
