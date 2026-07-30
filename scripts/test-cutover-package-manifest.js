'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function main() {
  const repositoryRoot = path.resolve(__dirname, '..');
  const manifestPath = path.join(
    repositoryRoot,
    'docs',
    'v5',
    'PACKAGE_MANIFEST_SCHEDULE_CONSOLE_CUTOVER.json'
  );

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf8')
  );

  assert.strictEqual(
    manifest.package,
    'v5-schedule-console-cutover-release-gate-ready'
  );

  assert.ok(
    Array.isArray(manifest.files),
    'A cutover manifest files mezője nem tömb.'
  );

  assert.ok(
    manifest.files.length >= 30,
    'A cutover manifest túl kevés fájlt tartalmaz.'
  );

  const seenPaths = new Set();

  for (const entry of manifest.files) {
    assert.ok(
      entry && typeof entry === 'object',
      'Érvénytelen cutover manifest-bejegyzés.'
    );

    assert.ok(
      typeof entry.path === 'string' && entry.path.trim(),
      'Hiányzó cutover manifest-fájlútvonal.'
    );

    assert.strictEqual(
      seenPaths.has(entry.path),
      false,
      `Duplikált cutover manifest-fájlútvonal: ${entry.path}`
    );

    seenPaths.add(entry.path);

    assert.match(
      entry.sha256,
      /^[a-f0-9]{64}$/i,
      `Érvénytelen SHA-256 formátum: ${entry.path}`
    );

    assert.ok(
      Number.isInteger(entry.bytes) && entry.bytes >= 0,
      `Érvénytelen fájlméret: ${entry.path}`
    );
  }

  for (const requiredPath of [
    '.env.example',
    'server2_final.js',
    'deploy/update.sh',
    'scripts/validate-repository.sh'
  ]) {
    assert.strictEqual(
      seenPaths.has(requiredPath),
      true,
      `Hiányzó kötelező cutover manifest-bejegyzés: ${requiredPath}`
    );
  }

  console.log('OK: archivált cutover csomagmanifest');
  console.log('OK: cutover manifest séma és SHA-256 formátum');
  console.log('OK: későbbi csomagok fájlmódosításai nem okoznak téves hashhibát');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
