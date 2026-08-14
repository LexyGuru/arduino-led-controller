'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

const readme = read('README.md');
const changelog = read('CHANGELOG.md');
const contributing = read('CONTRIBUTING.md');
const freeze = read('docs/v5/BETA7_UI_FREEZE.md');
const audit = read('docs/v5/MARKDOWN_AUDIT_BETA7.md');

// A fő README már a jelenlegi Beta.8 integrációs állapotot dokumentálja.
for (const marker of [
  '5.5.1-beta.1',
  '5.0.0-beta.8',
  'Direct API',
  'next/v5-rearchitecture',
  'Debian 13 Rust LXC',
  'React/Vite',
  'automatikus frissítés',
  'A/B EEPROM',
]) {
  assert.match(
    readme,
    new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );
}

// A Beta.7 feature ág többé nem lehet aktuális fejlesztési állapot a fő README-ben.
assert.doesNotMatch(readme, /feature\/beta7-ui-overhaul/);
assert.doesNotMatch(readme, /Folyamatban lévő fejlesztés \| Beta\.7 UI Freeze/);
assert.doesNotMatch(readme, /Node\.js \/ LXC üzemeltetési réteg/);
assert.doesNotMatch(readme, /Az ütemezéseket a szerver tárolja/);

// A Beta.7 dokumentumok történeti release/audit dokumentumként továbbra is megmaradnak.
assert.match(changelog, /\[Unreleased\] – Beta\.7 UI Freeze/);
assert.match(contributing, /Beta\.7 UI-fejlesztési szabályok/);
assert.match(freeze, /LedStrip.*`id`/);
assert.match(freeze, /Event Bus/);
assert.match(audit, /Auditált tracked Markdown fájlok/);
assert.match(audit, /történeti/);

// A történeti Beta.7 dokumentumoknak meg kell maradniuk és történetiként
// konzisztensnek kell lenniük, de a fő README-nek nem kötelező egyenként
// linkelnie minden korábbi Beta.7 dokumentumot. A README aktuális állapotot
// mutat; a történeti dokumentumok létezését és tartalmát fent közvetlenül
// ellenőrizzük.
assert.ok(fs.existsSync('docs/v5/BETA7_UI_FREEZE.md'));
assert.ok(fs.existsSync('docs/v5/MARKDOWN_AUDIT_BETA7.md'));

console.log(
  'OK: Beta.8 README aktuális; Beta.7 freeze/audit dokumentáció történetiként megőrizve'
);
