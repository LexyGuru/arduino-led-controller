'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const path =
  require('path');

function main() {
  const repositoryRoot =
    path.resolve(
      __dirname,
      '..'
    );

  const manifestPath =
    path.join(
      repositoryRoot,
      'docs',
      'v5',
      'PACKAGE_MANIFEST_LEGACY_ADAPTERS_PROMETHEUS_SHUTDOWN.json'
    );

  const manifest =
    JSON.parse(
      fs.readFileSync(
        manifestPath,
        'utf8'
      )
    );

  assert.strictEqual(
    manifest.package,
    'v5-legacy-adapters-prometheus-shutdown-ready'
  );

  assert.ok(
    Array.isArray(
      manifest.files
    ),
    'A legacy adapter manifest files mezője nem tömb.'
  );

  assert.strictEqual(
    manifest.files.length,
    manifest.fileCountExcludingManifest
  );

  assert.ok(
    manifest.files.length >= 30,
    'A legacy adapter manifest túl kevés fájlt tartalmaz.'
  );

  const seenPaths =
    new Set();

  for (
    const entry
    of manifest.files
  ) {
    assert.ok(
      entry &&
      typeof entry === 'object',
      'Érvénytelen manifest-bejegyzés.'
    );

    assert.ok(
      typeof entry.path ===
        'string' &&
      entry.path.trim(),
      'Hiányzó manifest-fájlútvonal.'
    );

    assert.strictEqual(
      seenPaths.has(
        entry.path
      ),
      false,
      `Duplikált manifest-fájlútvonal: ${entry.path}`
    );

    seenPaths.add(
      entry.path
    );

    assert.match(
      entry.sha256,
      /^[a-f0-9]{64}$/i,
      `Érvénytelen SHA-256 formátum: ${entry.path}`
    );

    assert.ok(
      Number.isInteger(
        entry.bytes
      ) &&
      entry.bytes >= 0,
      `Érvénytelen fájlméret: ${entry.path}`
    );
  }

  for (
    const requiredPath
    of [
      '.env.example',
      'server2_final.js',
      'deploy/update.sh',
      'scripts/validate-repository.sh'
    ]
  ) {
    assert.strictEqual(
      seenPaths.has(
        requiredPath
      ),
      true,
      `Hiányzó kötelező manifest-bejegyzés: ${requiredPath}`
    );
  }

  console.log(
    'OK: legacy adapter archivált csomagmanifest'
  );
  console.log(
    'OK: legacy manifest séma és SHA-256 formátum'
  );
  console.log(
    'OK: a későbbi csomagok által módosított fájlok nem okoznak téves hibát'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
}
