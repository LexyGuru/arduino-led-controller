#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const root=process.cwd();

  const jsonIntegritySource=fs.readFileSync(
    'desktop-tauri/src/i18n/jsonIntegrity.ts','utf8'
  );
  assert.match(jsonIntegritySource,/export function assertNoDuplicateJsonKeys\(raw: string\): void/);

  // Execute the same parser body after removing TypeScript-only annotations/export.
  const executableJsonIntegrity=jsonIntegritySource
    .replace('export function assertNoDuplicateJsonKeys(raw: string): void {',
             'function assertNoDuplicateJsonKeys(raw) {')
    .replace('function fail(message: string): never {','function fail(message) {')
    .replace('function parseLiteral(value: string): void {','function parseLiteral(value) {');
  const assertNoDuplicateJsonKeys=new Function(
    `${executableJsonIntegrity}; return assertNoDuplicateJsonKeys;`
  )();

  for(const raw of [
    '{"a":1,"a":2}',
    '{"outer":{"x":"A","x":"B"}}',
    '{"x":1,"\\u0078":2}',
    '{"items":[{"z":1,"z":2}]}'
  ]){
    assert.throws(()=>assertNoDuplicateJsonKeys(raw),/Duplicate JSON key/);
  }
  for(const raw of [
    '{"a":1,"b":2}',
    '{"outer":{"x":"A"},"items":[1,true,null,"x"]}',
    '{"x":1,"\\u0079":2}'
  ]){
    assert.doesNotThrow(()=>assertNoDuplicateJsonKeys(raw));
  }
  console.log('V804J_RAW_JSON_DUPLICATE_KEY_RUNTIME_TEST=PASSED');

  const localeSource=fs.readFileSync('desktop-tauri/src/i18n/locale.ts','utf8');
  assert.match(localeSource,/export function localeForLanguage\(language: string\): string/);
  assert.match(
    localeSource,
    /const COMMON_LOCALES: Readonly<Record<string, string>> = Object\.freeze\(/
  );
  const executableLocale=localeSource
    .replace(
      'const COMMON_LOCALES: Readonly<Record<string, string>> = Object.freeze(',
      'const COMMON_LOCALES = Object.freeze('
    )
    .replace('export function localeForLanguage(language: string): string {',
             'function localeForLanguage(language) {');
  const localeForLanguage=new Function(
    `${executableLocale}; return localeForLanguage;`
  )();
  assert.equal(localeForLanguage('en'),'en-US');
  assert.equal(localeForLanguage('hu'),'hu-HU');
  assert.equal(localeForLanguage('de'),'de-DE');
  assert.equal(localeForLanguage('fr'),'fr-FR');
  assert.equal(localeForLanguage('pt-BR'),'pt-BR');
  assert.equal(localeForLanguage('zh_Hant'),'zh-Hant');
  assert.equal(localeForLanguage('not a locale'),'en-US');
  console.log('V804J_CENTRAL_LOCALE_RESOLVER_RUNTIME_TEST=PASSED');

  const runtimePath=path.resolve(root,'desktop-tauri/src/i18n/runtime.ts');
  const runtimeSource=fs.readFileSync(runtimePath,'utf8');
  assert.ok(runtimePath.endsWith(path.join('desktop-tauri','src','i18n','runtime.ts')));
  assert.match(runtimeSource,/export type AppLanguage = string/);
  assert.match(runtimeSource,/assertNoDuplicateJsonKeys\(raw\)/);
  assert.match(runtimeSource,/validateManifest\(JSON\.parse\(raw\)\)/);
  assert.match(runtimeSource,/export \{ localeForLanguage \} from '\.\/locale'/);
  assert.doesNotMatch(runtimeSource,/const embeddedEnglishTestView = \{/);
  console.log(`V804J_FINAL_RUNTIME_SOURCE_PATH=${runtimePath}`);
  console.log('V804J_FINAL_RUNTIME_SOURCE_IDENTITY=PASSED');

  const firmware=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
  assert.match(firmware,/import \{ localeForLanguage \} from '\.\.\/i18n\/runtime'/);
  assert.doesNotMatch(firmware,/function localeForLanguage\(/);

  const index=fs.readFileSync('desktop-tauri/src/i18n/index.tsx','utf8');
  assert.match(index,/languageCatalogOnline: boolean/);
  assert.match(index,/navigator\.onLine/);
  assert.match(index,/addEventListener\('offline'/);

  const settings=fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx','utf8');
  for(const token of [
    "languagePack.checkUpdates",
    "languagePack.reinstall",
    "languagePack.internetRequired",
    "languagePack.offlineHelp",
    "languageCatalogOnline"
  ]) assert.ok(settings.includes(token),token);

  const srcRoot=path.join(root,'desktop-tauri/src');
  const localeImplementations=[];
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(full);
      else if(/\.(ts|tsx)$/.test(entry.name)){
        const rel=path.relative(root,full);
        const source=fs.readFileSync(full,'utf8');
        if(/function localeForLanguage\(/.test(source)){
          localeImplementations.push(rel);
        }
      }
    }
  }
  walk(srcRoot);
  localeImplementations.sort();
  assert.deepEqual(
    localeImplementations,
    ['desktop-tauri/src/i18n/locale.ts']
  );
  assert.ok(
    fs.existsSync('desktop-tauri/src/i18n/locale.ts'),
    'canonical typed locale implementation must exist'
  );
  console.log('V804J_CANONICAL_LOCALE_IMPLEMENTATION_COUNT=1');
  console.log('V804J_CANONICAL_LOCALE_IMPLEMENTATION_PATH=desktop-tauri/src/i18n/locale.ts');
  console.log('V804J_PAGE_LOCAL_LOCALE_RESOLVER_ZERO=PASSED');

  const en=JSON.parse(fs.readFileSync('desktop-tauri/src/i18n/locales/en.json','utf8'));
  const output=process.env.V804J_PACK_OUTPUT;
  assert.ok(output,'V804J_PACK_OUTPUT required');
  const packRoot=path.join(output,'language-packs');
  const hu=JSON.parse(fs.readFileSync(path.join(packRoot,'hu/locale.json'),'utf8'));
  const de=JSON.parse(fs.readFileSync(path.join(packRoot,'de/locale.json'),'utf8'));
  assert.deepEqual(Object.keys(hu.translations).sort(),Object.keys(en).sort());
  assert.deepEqual(Object.keys(de.translations).sort(),Object.keys(en).sort());
  for(const key of ['languagePack.checkUpdates','languagePack.reinstall','languagePack.offlineHelp']){
    assert.ok(en[key]&&hu.translations[key]&&de.translations[key],key);
  }
  console.log(`V804J_FINAL_CANONICAL_KEY_COUNT=${Object.keys(en).length}`);
  console.log('V804J_FINAL_EN_HU_DE_KEY_PARITY=PASSED');

  const guide=fs.readFileSync('docs/v5/V60_BETA1_INSTALLATION_GUIDE.md','utf8');
  const checklist=fs.readFileSync('docs/v5/V60_BETA1_RELEASE_CHECKLIST.md','utf8');
  const architecture=fs.readFileSync('docs/v6/LANGUAGE_PACK_ARCHITECTURE_2_0.md','utf8');
  for(const token of [
    'raw JSON duplicate keys',
    'last-known-good',
    'Internet required'
  ]) assert.ok(guide.includes(token),token);
  for(const token of [
    'Central locale resolver',
    'Reinstall',
    'No language-pack branch push'
  ]) assert.ok(checklist.includes(token),token);
  assert.ok(architecture.includes('manifest schema version are independent'));
  assert.ok(architecture.includes('BCP-47'));
  console.log('V804J_V6_DOCUMENTATION_CONTRACT=PASSED');

  console.log('V804J_FINAL_LANGUAGE_ARCHITECTURE_HARDENING=PASSED');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
