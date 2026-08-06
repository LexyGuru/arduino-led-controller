'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) =>
  fs.readFileSync(file, 'utf8');

const readme = read('README.md');
const changelog = read('CHANGELOG.md');
const contributing = read('CONTRIBUTING.md');
const freeze = read('docs/v5/BETA7_UI_FREEZE.md');
const audit = read('docs/v5/MARKDOWN_AUDIT_BETA7.md');

for (const marker of [
  'feature/beta7-ui-overhaul',
  'Beta.7 UI Freeze',
  'Theme Engine',
  'Tauri auditkonzol',
  'Legutóbbi műveletek',
  '4.3.0-beta.6',
  'Direct API',
  'A/B EEPROM',
]) {
  assert.match(
    readme,
    new RegExp(
      marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
  );
}

assert.doesNotMatch(
  readme,
  /Aktív fejlesztési ág \| `next\/v5-rearchitecture`/
);
assert.doesNotMatch(
  readme,
  /Az ütemezéseket a szerver tárolja/
);
assert.match(
  changelog,
  /\[Unreleased\] – Beta\.7 UI Freeze/
);
assert.match(
  contributing,
  /Beta\.7 UI-fejlesztési szabályok/
);
assert.match(
  freeze,
  /LedStrip.*`id`/
);
assert.match(
  freeze,
  /Event Bus/
);
assert.match(
  audit,
  /Auditált tracked Markdown fájlok/
);
assert.match(
  audit,
  /történeti/
);

console.log(
  'OK: README, changelog, contributing, Beta.7 UI Freeze és teljes Markdown-audit aktuális'
);
