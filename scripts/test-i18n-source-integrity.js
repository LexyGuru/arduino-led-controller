#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

const i18n = read('desktop-tauri/src/i18n/index.tsx');
const dashboard = read(
  'desktop-tauri/src/pages/DashboardPage.tsx'
);
const leds = read(
  'desktop-tauri/src/pages/LedsPage.tsx'
);
const schedules = read(
  'desktop-tauri/src/pages/SchedulesPage.tsx'
);

function languageSection(language, nextLanguage) {
  const startToken = `  ${language}: {`;
  const start = i18n.indexOf(startToken);

  assert.notEqual(
    start,
    -1,
    `Hiányzó i18n nyelvi objektum: ${language}`
  );

  const end = nextLanguage
    ? i18n.indexOf(`  ${nextLanguage}: {`, start)
    : i18n.indexOf('\n};', start);

  assert.notEqual(
    end,
    -1,
    `Nem határozható meg a nyelvi objektum vége: ${language}`
  );

  return i18n.slice(start, end);
}

const sections = {
  hu: languageSection('hu', 'en'),
  en: languageSection('en', 'de'),
  de: languageSection('de', null)
};

const keyPattern =
  /["']([^"']+)["']\s*:/g;

const keySets = {};

for (const [language, source] of Object.entries(sections)) {
  const keys = [];
  let match;

  while ((match = keyPattern.exec(source)) !== null) {
    keys.push(match[1]);
  }

  const duplicates = keys.filter(
    (key, index) => keys.indexOf(key) !== index
  );

  assert.deepEqual(
    [...new Set(duplicates)].sort(),
    [],
    `Duplikált ${language} i18n kulcsok`
  );

  keySets[language] = [...new Set(keys)].sort();
}

assert.deepEqual(
  keySets.en,
  keySets.hu,
  'Az angol i18n kulcskészlet eltér a magyartól.'
);

assert.deepEqual(
  keySets.de,
  keySets.hu,
  'A német i18n kulcskészlet eltér a magyartól.'
);

for (const key of [
  'schedules.deleteToken',
  'schedules.effect',
  'schedules.eventCount',
  'dashboard.scheduleCountMismatch',
  'firmware.targetFromConfig',
  'daysShort.1',
  'daysShort.7'
]) {
  for (const [language, source] of Object.entries(sections)) {
    assert.ok(
      source.includes(`"${key}"`) ||
        source.includes(`'${key}'`),
      `${language}: hiányzó i18n kulcs: ${key}`
    );
  }
}

assert.ok(
  dashboard.includes('dayKeys['),
  'A Dashboard nem a dayKeys fordítási listát használja.'
);
assert.ok(
  !dashboard.includes('dayNames['),
  'A Dashboard régi dayNames hivatkozást tartalmaz.'
);
assert.match(
  dashboard,
  /t\(\s*dayKeys\[/,
  'A Dashboard következő napneve nincs lefordítva.'
);

assert.ok(
  leds.includes('effectKeys.map'),
  'A LED oldal nem az effectKeys fordítási listát használja.'
);
assert.ok(
  leds.includes("{t('leds.effect')}"),
  'A LED effekt mező címkéje nincs lefordítva.'
);
assert.ok(
  !/\beffects\.map\s*\(/.test(leds),
  'A LED oldal régi effects változót használ.'
);
assert.match(
  leds,
  /effectKeys\.map[\s\S]*?\{t\(key\)\}/,
  'A LED effektlista nem fordítja le a kulcsokat.'
);

assert.ok(
  schedules.includes('dayShortKeys.map'),
  'A Schedule oldal nem a rövid napkulcsokat használja.'
);
assert.match(
  schedules,
  /dayShortKeys\.map[\s\S]*?\{t\(key\)\}/,
  'A Schedule rövid napgombja nem fordítja le a kulcsot.'
);

console.log('OK: nincs duplikált HU/EN/DE i18n kulcs');
console.log('OK: a három nyelv kulcskészlete azonos');
console.log('OK: Dashboard, LED és Schedule TypeScript hivatkozások javítva');
