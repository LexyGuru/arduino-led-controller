#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptsDir = path.resolve('scripts');
const allTests = fs.readdirSync(scriptsDir)
  .filter(name => /^test-.*\.js$/.test(name))
  .sort();
assert.ok(allTests.length >= 126, `Túl kevés test auditálva: ${allTests.length}`);

const forbidden = [
  'nem mindhárom nyelven',
  'A kulcs nem mindhárom nyelven létezik',
  'magyar–angol–német főoldali kulcslefedettség',
  "for(const lang of ['hu','en','de'])",
  '===3,`A kulcs'
];
for (const name of allTests) {
  if (name === 'test-i18n-legacy-contract-audit.js') continue;
  const source = fs.readFileSync(path.join(scriptsDir, name), 'utf8');
  for (const phrase of forbidden) {
    assert.ok(!source.includes(phrase), `${name}: legacy 3-language contract maradt: ${phrase}`);
  }
}

const runtime = fs.readFileSync('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt','utf8');
const english = JSON.parse(fs.readFileSync('desktop-tauri/src/i18n/locales/en.json','utf8'));
const versions = JSON.parse(fs.readFileSync('release-versions.json','utf8'));

assert.ok(Object.keys(english).length > 100);
assert.ok(runtime.includes("import embeddedEnglishJson from './locales/en.json'"));
assert.ok(runtime.includes('getInstalledPack(language)?.translations || embeddedEnglish'));
assert.ok(runtime.includes('Language pack keyset does not match the embedded English master.'));

const lp = versions.languagePackRelease;
assert.equal(lp.architectureVersion, '2.1');
assert.equal(lp.embeddedLanguage, 'en');
assert.equal(lp.totalLanguages, 15);
assert.equal(lp.downloadableLanguages, 14);
assert.equal(Object.keys(lp.packs).length, 14);

console.log(`OK: ${allTests.length} aktív JS test auditálva`);
console.log('OK: legacy three-language assertions = zero');
console.log('OK: Architecture 2.1 SSOT + canonical English runtime');
