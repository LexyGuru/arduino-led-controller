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


const runtime = read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');
const english = JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const versions = JSON.parse(read('release-versions.json'));
const settings = read('desktop-tauri/src/pages/SettingsPage.tsx');
const manager = read('desktop-tauri/src/components/LanguagePackManager.tsx');
const main = read('desktop-tauri/src/main.tsx');

assert.ok(settings.includes("import { useI18n } from '../i18n'"));
assert.ok(settings.includes("import { LanguagePackManager } from '../components/LanguagePackManager'"));
assert.ok(settings.includes('const { t, language, setLanguage } = useI18n()'));
assert.ok(settings.includes("const changeLanguage = (value: AppLanguage) =>"));
assert.ok(settings.includes('setLanguage(value)'));
assert.ok(settings.includes("set('language', value)"));
assert.ok(settings.includes('<LanguagePackManager selectedLanguage={language} onLanguageChange={changeLanguage} />'));
assert.ok(manager.includes('useI18n'));
assert.ok(main.includes('<I18nProvider>'));

const settingsKeys = assertKeysExist('SettingsPage', settings, english, 20);
const managerKeys = assertKeysExist('LanguagePackManager', manager, english, 5);

assert.ok(runtime.includes("import embeddedEnglishJson from './locales/en.json'"));
assert.ok(runtime.includes('const embeddedEnglish: Dictionary = embeddedEnglishJson as Dictionary'));
assert.ok(runtime.includes("if (language === 'en') return embeddedEnglish"));
assert.ok(runtime.includes('getInstalledPack(language)?.translations || embeddedEnglish'));
assert.ok(runtime.includes('Language pack keyset does not match the embedded English master.'));

const lp = versions.languagePackRelease;
assert.equal(lp.architectureVersion, '2.1');
assert.equal(lp.catalogVersion, '2.1.0');
assert.equal(lp.embeddedLanguage, 'en');
assert.equal(lp.totalLanguages, 15);
assert.equal(lp.downloadableLanguages, 14);
assert.equal(Object.keys(lp.packs).length, 14);

console.log(`OK: SettingsPage canonical English kulcsok: ${settingsKeys.length}`);
console.log(`OK: LanguagePackManager canonical English kulcsok: ${managerKeys.length}`);
console.log('OK: Language Pack Architecture 2.1 i18n foundation');
