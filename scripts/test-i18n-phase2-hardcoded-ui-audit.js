#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

function staticTranslationKeys(source) {
  const result = new Set();
  const pattern = /\bt\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) result.add(match[1]);
  return [...result].sort();
}
function assertKeysExist(sourceName, source, english, minimum = 1) {
  const keys = staticTranslationKeys(source);
  assert.ok(keys.length >= minimum, `${sourceName}: túl kevés statikus i18n kulcs: ${keys.length}`);
  for (const key of keys) {
    assert.equal(typeof english[key], 'string', `${sourceName}: canonical English kulcs hiányzik: ${key}`);
    assert.ok(english[key].length > 0, `${sourceName}: canonical English kulcs üres: ${key}`);
  }
  return keys;
}


const english = JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const runtime = read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');
const sources = {
  SchedulesPage: read('desktop-tauri/src/pages/SchedulesPage.tsx'),
  DashboardPage: read('desktop-tauri/src/pages/DashboardPage.tsx'),
  FirmwarePage: read('desktop-tauri/src/pages/FirmwarePage.tsx')
};

for (const [name, source] of Object.entries(sources)) {
  const keys = assertKeysExist(name, source, english, 3);
  console.log(`OK: ${name} audited static keys=${keys.length}`);
}

for (const token of ['const dayKeys','const dayShortKeys','const effectKeys']) {
  assert.ok(sources.SchedulesPage.includes(token), `SchedulesPage hiányzó i18n szerkezet: ${token}`);
}

for (const legacy of [
  'const DAYS =','const DAY_SHORT =','const EFFECTS =','JSON időzítés',
  'időzítés exportálva mobilos megosztással','AUTOMATIKUS BACKUPOK',
  'A V5 szerver Arduino-beállításából származik'
]) {
  for (const [name, source] of Object.entries(sources)) {
    assert.ok(!source.includes(legacy), `${name}: legacy hardcoded UI maradt: ${legacy}`);
  }
}

assert.ok(runtime.includes('Language pack keyset does not match the embedded English master.'));
console.log('OK: Phase 2 hardcoded UI audit Architecture 2.1 kompatibilis');
