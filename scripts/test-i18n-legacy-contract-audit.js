#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptsDir = path.resolve('scripts');

const allTests = fs.readdirSync(scriptsDir)
  .filter((name) => /^test-.*\.js$/.test(name))
  .sort();

const contractTests = allTests.filter(
  (name) => name !== 'test-i18n-legacy-contract-audit.js'
);

assert.ok(
  allTests.length >= 126,
  `Túl kevés ellenőrzőfájl került auditálásra: ${allTests.length}`
);

assert.equal(
  allTests.length,
  contractTests.length + 1,
  'Az audit csak a saját fájlját zárhatja ki.'
);

const translatedSources = [
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'desktop-tauri/src/components/Sidebar.tsx',
  'desktop-tauri/src/components/Topbar.tsx'
];

const relevant = contractTests.filter((name) => {
  const source = fs.readFileSync(path.join(scriptsDir, name), 'utf8');
  return translatedSources.some((target) => source.includes(target));
});

assert.deepEqual(
  relevant,
  [
    'test-beta4-stabilization.js',
    'test-desktop-v5-ui-contract.js',
    'test-i18n-foundation.js',
    'test-mobile-hotfix-contract.js',
    'test-tauri-direct-api-v1-transport.js',
    'test-tauri-macos-ddns-first.js',
    'test-tauri-settings-update-contract.js'
  ],
  'Megváltozott az i18n-érintett UI contract tesztek listája.'
);

const requiredI18nAware = [
  'test-beta4-stabilization.js',
  'test-desktop-v5-ui-contract.js',
  'test-mobile-hotfix-contract.js',
  'test-tauri-direct-api-v1-transport.js',
  'test-tauri-macos-ddns-first.js',
  'test-tauri-settings-update-contract.js'
];

for (const name of requiredI18nAware) {
  const source = fs.readFileSync(path.join(scriptsDir, name), 'utf8');

  assert.ok(
    source.includes('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt'),
    `${name}: hiányzik az i18n szótár ellenőrzése.`
  );
}

/*
 * Csak a régi ellenőrzési FORMÁT tiltjuk.
 * A magyar fordításoknak továbbra is szerepelniük kell az i18n szótárban.
 */
const forbiddenLegacyPatterns = [
  [
    'test-beta4-stabilization.js',
    /settings\.includes\(\s*['"]Firmware-frissítési csatorna['"]\s*\)/
  ],
  [
    'test-mobile-hotfix-contract.js',
    /assert\.match\(\s*settings\s*,\s*\/OTA firmware-frissítés letiltva\//
  ],
  [
    'test-tauri-direct-api-v1-transport.js',
    /settings\.includes\(\s*['"]Távoli protokoll['"]\s*\)/
  ],
  [
    'test-tauri-direct-api-v1-transport.js',
    /settings\.includes\(\s*['"]Helyi protokoll['"]\s*\)/
  ],
  [
    'test-tauri-macos-ddns-first.js',
    /settings\.includes\(\s*['"]macOS-en a távoli HTTPS\/DDNS mindig elsődleges['"]\s*\)/
  ],
  [
    'test-tauri-settings-update-contract.js',
    /settings\.includes\(\s*['"]IP vagy DDNS['"]\s*\)/
  ]
];

for (const [name, pattern] of forbiddenLegacyPatterns) {
  const source = fs.readFileSync(path.join(scriptsDir, name), 'utf8');

  assert.doesNotMatch(
    source,
    pattern,
    `${name}: elavult közvetlen komponensszöveg-contract maradt.`
  );
}

const settings = fs.readFileSync(
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'utf8'
);
const sidebar = fs.readFileSync(
  'desktop-tauri/src/components/Sidebar.tsx',
  'utf8'
);
const topbar = fs.readFileSync(
  'desktop-tauri/src/components/Topbar.tsx',
  'utf8'
);
const i18n = fs.readFileSync(
  'scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt',
  'utf8'
);

for (const key of [
  'settings.remoteProtocol',
  'settings.localProtocol',
  'settings.remoteHost',
  'settings.macosLocalAdvanced',
  'settings.direct.macosNotice',
  'settings.updates.firmwareChannel',
  'settings.mobile.title',
  'settings.mobile.notice'
]) {
  assert.ok(
    settings.includes(key),
    `A SettingsPage nem használja a fordítási kulcsot: ${key}`
  );

  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (i18n.match(new RegExp(`'${escaped}'`, 'g')) || []).length;

  assert.equal(
    count,
    3,
    `A kulcs nem mindhárom nyelven létezik: ${key}`
  );
}

for (const key of [
  'nav.dashboard',
  'nav.leds',
  'nav.schedules',
  'nav.firmware',
  'nav.logs',
  'nav.settings'
]) {
  assert.ok(
    sidebar.includes(key),
    `A Sidebar nem használja a fordítási kulcsot: ${key}`
  );
}

assert.ok(
  topbar.includes('topbar.'),
  'A Topbar nem használ i18n fordítási kulcsokat.'
);

console.log(`OK: ${allTests.length} ellenőrzőfájl megszámolva`);
console.log(`OK: ${relevant.length} i18n-érintett UI contract azonosítva`);
console.log('OK: a contractok szerkezetileg i18n-kompatibilisek');
console.log('OK: a magyar fordítások megmaradhatnak az i18n szótárban');
