'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(
  root,
  'docs/v5/PACKAGE_MANIFEST_SCHEDULE_CONSOLE_CUTOVER.json'
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.package, 'v5-schedule-console-cutover-release-gate-ready');
assert.ok(Array.isArray(manifest.files));
assert.ok(manifest.files.length >= 30);
for (const entry of manifest.files) {
  const filePath = path.join(root, entry.path);
  assert.ok(fs.existsSync(filePath), `Hiányzó fájl: ${entry.path}`);
  const digest = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  assert.strictEqual(digest, entry.sha256, `Eltérő SHA-256: ${entry.path}`);
}
console.log('OK: cutover csomagmanifest');
console.log('OK: fájlonkénti SHA-256 ellenőrzés');
