#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const read = (path) => fs.readFileSync(path, 'utf8');

assert.strictEqual(read('VERSION').trim(), '5.0.0-beta.1');

const docs = [
  'README.md',
  'firmware/README.md',
  'docs/firmware/FIRMWARE_4_3_0_BETA_1.md',
  'docs/firmware/DIRECT_API_V1.md',
  'docs/firmware/EEPROM_STORAGE.md',
  'docs/firmware/OTA_UPDATE.md',
  'docs/firmware/TESTING.md',
  'docs/v5/V5_IMPLEMENTATION_STATUS.md',
  'docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'CONTRIBUTING.md'
];

for (const path of docs) {
  assert.ok(fs.existsSync(path), `Hiányzó dokumentum: ${path}`);
}

const all = docs.map(read).join('\n');
for (const marker of [
  '5.0.0-beta.1',
  '4.3.0-beta.1',
  'Direct API',
  '1.0.0',
  'HTTP 202',
  '60'
]) {
  assert.ok(all.includes(marker), `Hiányzó dokumentációs marker: ${marker}`);
}

assert.doesNotMatch(read('README.md'), /firmware:\s*`4\.1\.21`/i);
console.log('OK: aktuális V5 és firmware dokumentáció');
