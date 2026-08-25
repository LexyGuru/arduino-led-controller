#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const output=path.resolve(
  process.env.V804J_PACK_OUTPUT ||
  path.resolve(root,'LANGUAGE_PACKS_READY_TO_PUBLISH')
);

function resolvePackRoot(outputRoot){
  const direct=path.join(outputRoot,'manifest.json');
  const nested=path.join(outputRoot,'language-packs','manifest.json');

  if(fs.existsSync(direct)) return outputRoot;
  if(fs.existsSync(nested)) return path.join(outputRoot,'language-packs');

  throw new Error(
    `V804J_ERROR: language-pack manifest not found under ${outputRoot} ` +
    `(checked manifest.json and language-packs/manifest.json)`
  );
}

const packRoot=resolvePackRoot(output);
const manifestPath=path.join(packRoot,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const en=JSON.parse(fs.readFileSync('desktop-tauri/src/i18n/locales/en.json','utf8'));

console.log(`V804J_PUBLICATION_PACK_ROOT=${packRoot}`);
console.log(`V804J_PUBLICATION_MANIFEST=${manifestPath}`);

function sha256(raw){
  return crypto.createHash('sha256').update(raw).digest('hex');
}
function placeholders(value){
  return [...new Set(
    [...String(value).matchAll(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g)]
      .map(m=>m[1]||m[2])
  )].sort();
}
function compareArrays(a,b){
  return a.length===b.length && a.every((x,i)=>x===b[i]);
}

assert.equal(
  manifest.schemaVersion,
  1,
  'publication manifest schema must match Language Pack Architecture 2.0 runtime schema v1'
);
assert.equal(manifest.defaultLanguage,'en');
assert.deepEqual(Object.keys(manifest.embedded),['en']);

for(const code of ['hu','de']){
  const entry=manifest.languages[code];
  assert.ok(entry,`${code} missing`);
  assert.equal(entry.status,'available');
  assert.equal(entry.minAppVersion,'6.0.0-beta.1');
  assert.equal(entry.maxAppVersion,'6.999.999');
  assert.ok(entry.file,`${code} file`);
  assert.ok(!path.isAbsolute(entry.file),`${code} file must be relative`);
  assert.ok(!entry.file.split(/[\\/]+/).includes('..'),`${code} file traversal`);
  assert.ok(/^[a-f0-9]{64}$/.test(entry.sha256||''),`${code} sha`);

  const raw=fs.readFileSync(path.join(packRoot,entry.file));
  assert.equal(sha256(raw),entry.sha256,`${code} manifest sha mismatch`);
  const pack=JSON.parse(raw);
  assert.equal(pack.schemaVersion,1,`${code} pack schema`);
  assert.equal(pack.schemaVersion,manifest.schemaVersion,`${code} schema parity`);
  assert.equal(pack.language,code);
  assert.equal(pack.packVersion,entry.packVersion||entry.version);
  assert.equal(pack.minAppVersion,entry.minAppVersion);
  assert.equal(pack.maxAppVersion,entry.maxAppVersion);

  const enKeys=Object.keys(en).sort();
  const packKeys=Object.keys(pack.translations).sort();
  assert.deepEqual(packKeys,enKeys,`${code} key parity`);

  for(const key of enKeys){
    assert.equal(typeof pack.translations[key],'string',`${code}:${key} non-string`);
    assert.notEqual(pack.translations[key].trim(),'',
      `${code}:${key} empty`);
    assert.ok(compareArrays(placeholders(pack.translations[key]),placeholders(en[key])),
      `${code}:${key} placeholder mismatch`);
  }
  console.log(`V804J_${code.toUpperCase()}_PUBLICATION_READY=PASSED`);
}

assert.ok(manifest.languages.fr,'fr manifest entry missing');
assert.equal(manifest.languages.fr.status,'pending');
assert.ok(!manifest.languages.fr.file,'FR must not publish a fake pack');
console.log('V804J_FR_PENDING_REAL_TRANSLATION=PASSED');

assert.equal(manifest.languages.hu.status,'available');
assert.equal(manifest.languages.de.status,'available');
console.log('V804J_REMOTE_MANIFEST_PUBLICATION_SHAPE=PASSED');
console.log('V804J_LANGUAGE_PACK_PUBLICATION_READINESS=PASSED');

console.log('V804J_PUBLICATION_REAL_LAYOUT_SCHEMA_V1=PASSED');
