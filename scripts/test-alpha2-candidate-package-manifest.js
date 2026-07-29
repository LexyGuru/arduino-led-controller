'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function main() {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        '..',
        'docs',
        'v5',
        'PACKAGE_MANIFEST_ALPHA2_CANDIDATE.json'
      ),
      'utf8'
    )
  );

  assert.strictEqual(
    manifest.package,
    'v5-alpha2-candidate-security-ota-client-ready'
  );

  assert.ok(Array.isArray(manifest.files));
  assert.ok(manifest.files.length >= 30);

  const paths = new Set();

  for (const entry of manifest.files) {
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(entry.bytes));
    assert.strictEqual(paths.has(entry.path), false);
    paths.add(entry.path);
  }

  for (const required of [
    'server/security/api-token-service.js',
    'server/firmware/firmware-backup-store.js',
    'scripts/generate-openapi-typescript.js',
    'deploy/test-alpha2-lxc.sh'
  ]) {
    assert.strictEqual(paths.has(required), true);
  }

  console.log('OK: alpha.2 candidate csomagmanifest');
  console.log('OK: fájlonkénti SHA-256 formátum és egyedi útvonal');
  console.log('OK: archivált manifest nem hasonlít későbbi repository-fájlokat');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
