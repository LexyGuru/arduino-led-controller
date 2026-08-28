#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (file) => fs.readFileSync(file, 'utf8');

const page = read('desktop-tauri/src/pages/FirmwarePage.tsx');
const runtime = read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');
const english = JSON.parse(read('desktop-tauri/src/i18n/locales/en.json'));
const types = read('desktop-tauri/src/types/index.ts');
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const versions = JSON.parse(read('release-versions.json'));

assert.match(page, /function deduplicateFirmwareCatalog/);
assert.match(page, /const firmwareCatalog = deduplicateFirmwareCatalog\(releaseCatalog\)/);
assert.match(page, /firmware\.versionTitle/);

assert.match(page, /const controller = createOta2LiveInstallController\(\{/);
assert.match(page, /firmwareInstallRelease:\s*\(version,\s*channel\)\s*=>/);
assert.match(page, /tauriApi\.firmwareInstallRelease\(version,\s*channel\s*\?\?\s*selectedFirmwareChannel\)/);
assert.match(page, /firmwareStatus:\s*\(_updateChannel,\s*channel\)\s*=>/);
assert.match(page, /tauriApi\.firmwareStatus\(undefined,\s*channel\s*\?\?\s*selectedFirmwareChannel\)/);
assert.match(page, /subscribeProgress:\s*tauriApi\.listenOtaProgress/);
assert.match(page, /createBackup:\s*\(\)\s*=>\s*recovery\.prepare\(\)/);
assert.match(
  page,
  /const value = await controller\.install\(\{[\s\S]*?firmware,[\s\S]*?artifact:\s*item,[\s\S]*?version,[\s\S]*?onRuntime:\s*setOta2Runtime[\s\S]*?\}\);/
);
assert.match(
  page,
  /await installCatalogItem\(\s*item,\s*version,\s*installed[\s\S]*?\?\s*'reinstall'[\s\S]*?:\s*rollback[\s\S]*?\?\s*'restore'[\s\S]*?:\s*'update'[\s\S]*?\);/
);
assert.match(page, /compareVersions\(version, firmware\.installedVersion\)/);
assert.doesNotMatch(page, /releaseCatalog\.map\(\(item\)/);
assert.match(types, /relatedTags\?: string\[\]/);

const firmwareKeys = [
  'firmware.versionTitle',
  'firmware.badgeInstalled',
  'firmware.badgeLatest',
  'firmware.badgePrevious',
  'firmware.fileLabel'
];
for (const key of firmwareKeys) {
  assert.equal(typeof english[key], 'string', `${key} hiányzik a canonical English masterből`);
  assert.ok(english[key].length > 0, `${key} üres a canonical English masterben`);
}

assert.ok(runtime.includes("import embeddedEnglishJson from './locales/en.json'"));
assert.ok(runtime.includes('const embeddedEnglish: Dictionary = embeddedEnglishJson as Dictionary'));
assert.ok(runtime.includes("if (language === 'en') return embeddedEnglish"));
assert.ok(runtime.includes('getInstalledPack(language)?.translations || embeddedEnglish'));
assert.ok(runtime.includes('const englishKeys = Object.keys(embeddedEnglish).sort()'));
assert.ok(runtime.includes('Language pack keyset does not match the embedded English master.'));

const lp = versions.languagePackRelease;
assert.ok(lp);
assert.equal(lp.architectureVersion, '2.1');
assert.equal(lp.catalogVersion, '2.1.0');
assert.equal(lp.totalLanguages, 15);
assert.equal(lp.downloadableLanguages, 14);

console.log('OK: Language Pack Architecture 2.1 canonical English firmware kulcscontract');
console.log('OK: firmware-katalógus deduplikáció, OTA 2.0 install wiring, egyértelmű címek és szemantikus verziókezelés');

assert.match(rust, /FIRMWARE_BETA_RELEASE_TAG/);
assert.match(rust, /github_releases/);
assert.match(rust, /release_matches_channel/);
assert.match(rust, /firmware_artifacts_from_release/);
assert.match(rust, /firmware_artifacts_from_release_channel/);
assert.match(rust, /release\.tag_name == FIRMWARE_BETA_RELEASE_TAG/);
assert.match(rust, /artifact\.channel == normalized_channel/);
assert.doesNotMatch(rust, /firmware_beta_release/);
assert.doesNotMatch(rust, /firmware_version_from_release_body/);
console.log('OK: dedikált firmware release és többverziós rollback katalógus');
