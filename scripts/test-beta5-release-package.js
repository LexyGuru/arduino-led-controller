#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (file) => fs.readFileSync(file, 'utf8');
const files = [
  'docs/v5/BETA5_INSTALLATION_GUIDE.md',
  'docs/v5/BETA5_RELEASE_NOTES.md',
  'docs/v5/BETA5_RELEASE_CHECKLIST.md'
];
for (const file of files) assert.ok(fs.existsSync(file), `Hiányzó történelmi Beta.5 dokumentum: ${file}`);
const installationGuide = read(files[0]);
const releaseNotes = read(files[1]);
const releaseChecklist = read(files[2]);
for (const [name, content] of [['telepítési útmutató', installationGuide], ['release notes', releaseNotes], ['release checklist', releaseChecklist]]) {
  assert.match(content, /5\.0\.0-beta\.5/, `Hiányzó Beta.5 marker: ${name}`);
  assert.match(content, /4\.3\.0-beta\.4/, `Hiányzó Beta.5 firmware-hotfix marker: ${name}`);
}
assert.doesNotMatch(releaseNotes, /5\.0\.0-beta\.6/, 'A történelmi Beta.5 release notes nem írható át Beta.6 kiadássá');
console.log('OK: történelmi 5.0.0-beta.5 dokumentáció és firmware-párosítás contract');
