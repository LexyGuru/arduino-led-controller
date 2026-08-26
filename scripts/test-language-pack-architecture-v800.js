#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('desktop-tauri/src/i18n/runtime.ts');
const provider=read('desktop-tauri/src/i18n/index.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');
const languageManager=read('desktop-tauri/src/components/LanguagePackManager.tsx');
const types=read('desktop-tauri/src/types/index.ts');
const firmwarePage=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const themeEngineTest=read('scripts/test-theme-engine-v3.js');
const en=JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const release=JSON.parse(read('release-versions.json'));
const version=read('VERSION').trim();
const languagePackArchitecture=release.languagePackRelease.architectureVersion;
const betaVersion=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
const releaseCandidate=betaVersion?`beta.${betaVersion[4]}-gate`:'stable-gate';
const stagingEnv=read('deploy/staging.env.example');
const versionSync=read('scripts/sync-current-version-surfaces.js');
const tauriSettingsContract=read('scripts/test-tauri-settings-update-contract.js');
const directApiContract=read('scripts/test-tauri-direct-api-v1-transport.js');
const themeHardening=read('scripts/test-theme-hardening-v587.js');
const v621Contract=read('scripts/test-v621-startup-error-update-visibility.js');

assert.equal(release.application,version);
assert.equal(release.applicationRelease.version,version);
assert.equal(release.firmware,'5.1.0-beta.3');
assert.equal(release.directApi,'1.1.0');
assert.ok(stagingEnv.includes(`RELEASE_TARGET_VERSION=${version}`));
assert.ok(stagingEnv.includes(`RELEASE_CANDIDATE=${releaseCandidate}`));
assert.ok(versionSync.includes("const stagingEnvPath = 'deploy/staging.env.example';"));
assert.ok(versionSync.includes('RELEASE_TARGET_VERSION=${release.application}'));
assert.ok(directApiContract.includes('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt'));
assert.ok(!directApiContract.includes('desktop-tauri/src/i18n/runtime.ts'));
assert.ok(themeHardening.includes('scripts/fixtures/i18n-embedded-en-compat-v800.txt'));
assert.ok(!themeHardening.includes('desktop-tauri/src/i18n/runtime.ts'));
assert.ok(v621Contract.includes('huPack.translations'));
assert.ok(v621Contract.includes('embeddedEnglish'));
assert.ok(v621Contract.includes('dePack.translations'));
assert.ok(!v621Contract.includes("const huStart=i18n.indexOf"));
assert.ok(Object.keys(en).length>=900);

for(const key of ['languagePack.title','languagePack.download','languagePack.installed',
'languagePack.pending','settings.ledTopology.title','settings.ledTopology.help',
'settings.ledTopology.save','settings.ledTopology.load']) assert.equal(typeof en[key],'string',key);

for(const marker of ["import embeddedEnglishJson from './locales/en.json'",
'LANGUAGE_PACK_MANIFEST_URL','fetchLanguageManifest','installLanguagePack',
'removeLanguagePack','PACK_TEMP_PREFIX','SHA-256 verification failed',
'Language pack keyset does not match the embedded English master'])
assert.ok(runtime.includes(marker),marker);

for(const marker of ['languageCatalog','installedLanguages','refreshLanguageCatalog',
'installLanguage','uninstallLanguage']) assert.ok(provider.includes(marker),marker);

for(const marker of [
  'MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000',
  'MAX_PACK_BYTES = 1024 * 1024',
  'maxAppVersion?: string',
  'placeholdersOf',
  'assertPlaceholderParity',
  'Language pack placeholder mismatch',
  'Language pack exceeds the maximum allowed size',
  'shouldRefreshLanguageManifest',
  'isLanguagePackUpdateAvailable',
  'Language pack atomic commit verification failed'
]) assert.ok(runtime.includes(marker),marker);
assert.ok(runtime.includes('doubleKey: string | undefined'));
assert.ok(runtime.includes('singleKey: string | undefined'));
assert.ok(provider.includes('shouldRefreshLanguageManifest()'));
assert.ok(provider.includes('updateAvailable: isLanguagePackUpdateAvailable'));
assert.ok(languageManager.includes("t('languagePack.updateAvailable')"));
assert.ok(languageManager.includes("t('languagePack.update')"));

assert.ok(types.includes('language: string;'));
assert.ok(
  firmwarePage.includes("import { localeForLanguage } from '../i18n/runtime';")
);
assert.ok(!firmwarePage.includes('function localeForLanguage(language: string)'));
assert.ok(runtime.includes("export { localeForLanguage } from './locale';"));
assert.ok(firmwarePage.includes('function logTime(timestamp: number, language: string)'));
assert.ok(firmwarePage.includes('const locale = localeForLanguage(language);'));
assert.ok(!firmwarePage.includes("language: 'hu' | 'en' | 'de'"));
assert.ok(themeEngineTest.includes('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt'));
assert.ok(!themeEngineTest.includes('desktop-tauri/src/i18n/runtime.ts'));
assert.ok(languageManager.includes(`data-language-pack-manager="${languagePackArchitecture}"`));
assert.ok(settings.includes("import { LanguagePackManager } from '../components/LanguagePackManager';"));
assert.ok(settings.includes("t('settings.ledTopology.title')"));
assert.ok(settings.includes("t('settings.ledTopology.help')"));

for(const forbidden of ['Visual 3.1 KONFIGURATIONSZENTRALE',
'<h2>LED hardverkonfiguráció</h2>',
'A fizikai PIN-ek firmware-szinten rögzítettek.',
"ledTopologyBusy?'Mentés…':'LED konfiguráció mentése'",
"ledTopologyBusy?'Betöltés…':'LED konfiguráció betöltése'"])
assert.ok(!settings.includes(forbidden),forbidden);

console.log(`V804J_EMBEDDED_EN_KEY_COUNT=${Object.keys(en).length}`);
console.log('V804J_ENGLISH_EMBEDDED_MASTER=PASSED');
console.log('V804J_DOWNLOADABLE_PACK_RUNTIME=PASSED');
console.log('V804J_PERSISTENT_PACK_STORAGE=PASSED');
console.log('V804J_SHA256_SCHEMA_GUARD=PASSED');
console.log('V804J_ENGLISH_FALLBACK=PASSED');
console.log('V804J_DYNAMIC_LANGUAGE_CATALOG=PASSED');
console.log('V804J_SETTINGS_PACK_MANAGER=PASSED');
console.log('V804J_DYNAMIC_FIRMWARE_LOCALE_TYPING=PASSED');
console.log('V804J_SETTINGS_HARDCODED_LANGUAGE_SWEEP=PASSED');
console.log(`V804J_DYNAMIC_APPLICATION_VERSION=PASSED:${version}`);
console.log('V804J_PLACEHOLDER_PARITY_VALIDATION=PASSED');
console.log('V804J_SINGLE_DOUBLE_BRACE_INTERPOLATION=PASSED');
console.log('V804J_MANIFEST_CACHE_TTL=PASSED');
console.log('V804J_LANGUAGE_PACK_MAX_SIZE=PASSED');
console.log('V804J_MIN_MAX_APP_COMPATIBILITY=PASSED');
console.log('V804J_ATOMIC_LAST_KNOWN_GOOD=PASSED');
console.log('V804J_PACK_UPDATE_AVAILABLE_STATE=PASSED');
