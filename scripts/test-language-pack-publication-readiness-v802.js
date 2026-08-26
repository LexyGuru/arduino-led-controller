#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const release=JSON.parse(fs.readFileSync(path.join(root,'release-versions.json'),'utf8'));
const lp=release.languagePackRelease;
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
    `V843_ERROR: language-pack manifest not found under ${outputRoot} `+
    '(checked manifest.json and language-packs/manifest.json)'
  );
}
function sha256(raw){return crypto.createHash('sha256').update(raw).digest('hex');}
function placeholders(value){
  return [...String(value).matchAll(/\\{\\{\\s*([A-Za-z0-9_.-]+)\\s*\\}\\}|\\{\\s*([A-Za-z0-9_.-]+)\\s*\\}/g)]
    .map(m=>m[0]);
}

assert.ok(lp);
assert.equal(lp.architectureVersion,'2.1');
assert.equal(lp.catalogVersion,'2.1.0');
assert.equal(lp.totalLanguages,15);
assert.equal(lp.downloadableLanguages,14);

const packRoot=resolvePackRoot(output);
const manifestPath=path.join(packRoot,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const en=JSON.parse(fs.readFileSync('desktop-tauri/src/i18n/locales/en.json','utf8'));

assert.equal(manifest.schemaVersion,1);
assert.equal(manifest.catalogVersion,lp.catalogVersion);
assert.equal(manifest.defaultLanguage,'en');
assert.deepEqual(Object.keys(manifest.embedded),['en']);

const codes=Object.keys(lp.packs);
assert.equal(codes.length,lp.downloadableLanguages);
assert.deepEqual(Object.keys(manifest.languages),codes);

for(const code of codes){
  const canon=lp.packs[code];
  const entry=manifest.languages[code];
  assert.ok(entry,`${code} missing`);
  assert.equal(entry.status,canon.status,`${code} status`);
  assert.equal(entry.packVersion,canon.version,`${code} pack version`);
  assert.equal(entry.minAppVersion,release.application,`${code} minAppVersion`);
  assert.equal(entry.maxAppVersion,'6.999.999',`${code} maxAppVersion`);
  assert.ok(entry.file,`${code} file`);
  assert.ok(!path.isAbsolute(entry.file),`${code} absolute path forbidden`);
  assert.ok(!entry.file.split(/[\\\\/]+/).includes('..'),`${code} traversal`);
  assert.ok(/^[a-f0-9]{64}$/.test(entry.sha256||''),`${code} sha`);

  const raw=fs.readFileSync(path.join(packRoot,entry.file));
  assert.equal(sha256(raw),entry.sha256,`${code} manifest sha`);
  const pack=JSON.parse(raw);
  assert.equal(pack.schemaVersion,manifest.schemaVersion,`${code} schema`);
  assert.equal(pack.language,code,`${code} identity`);
  assert.equal(pack.packVersion,canon.version,`${code} payload version`);
  assert.equal(pack.minAppVersion,release.application,`${code} payload minAppVersion`);
  assert.equal(pack.maxAppVersion,'6.999.999',`${code} payload maxAppVersion`);

  const enKeys=Object.keys(en);
  const packKeys=Object.keys(pack.translations);
  assert.deepEqual(packKeys,enKeys,`${code} exact key parity/order`);
  for(const key of enKeys){
    assert.equal(typeof pack.translations[key],'string',`${code}:${key} type`);
    assert.notEqual(pack.translations[key].trim(),'',
      `${code}:${key} empty`);
    assert.deepEqual(placeholders(pack.translations[key]),placeholders(en[key]),
      `${code}:${key} placeholder sequence`);
  }
  console.log(`V843_${code.replace(/[^A-Za-z0-9]/g,'_').toUpperCase()}_PUBLICATION_READY=PASSED`);
}

assert.ok(!Object.values(manifest.languages).some(x=>x.status==='pending'));
console.log('V843_NO_PENDING_LANGUAGE_PACKS=PASSED');
console.log('V843_LANGUAGE_PACK_PUBLICATION_READINESS=PASSED');
