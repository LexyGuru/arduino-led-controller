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
const pages = {
  DashboardPage: read('desktop-tauri/src/pages/DashboardPage.tsx'),
  LedsPage: read('desktop-tauri/src/pages/LedsPage.tsx'),
  SchedulesPage: read('desktop-tauri/src/pages/SchedulesPage.tsx'),
  FirmwarePage: read('desktop-tauri/src/pages/FirmwarePage.tsx'),
  LogsPage: read('desktop-tauri/src/pages/LogsPage.tsx')
};

for (const [name, source] of Object.entries(pages)) {
  assert.ok(source.includes('useI18n'), `${name}: hiányzik useI18n`);
  const keys = assertKeysExist(name, source, english, 3);
  console.log(`OK: ${name} static i18n keys=${keys.length}`);
}

assert.ok(pages.DashboardPage.includes('dayKeys'));
assert.ok(pages.LedsPage.includes('effectKeys'));
assert.ok(pages.SchedulesPage.includes('const dayKeys'));
assert.ok(pages.SchedulesPage.includes('const dayShortKeys'));
assert.ok(pages.SchedulesPage.includes('const effectKeys'));
assert.ok(!pages.SchedulesPage.includes('const DAYS ='));
assert.ok(!pages.SchedulesPage.includes('const DAY_SHORT ='));
assert.ok(!pages.SchedulesPage.includes('const EFFECTS ='));

console.log('OK: main pages canonical English translation contract');
