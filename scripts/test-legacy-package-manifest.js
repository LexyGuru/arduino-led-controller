'use strict';

const assert =
  require('assert');
const crypto =
  require('crypto');
const fs =
  require('fs');
const path =
  require('path');

function sha256(
  filePath
) {
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        filePath
      )
    )
    .digest('hex');
}

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
    manifest.files.length,
    manifest.fileCountExcludingManifest
  );

  for (
    const entry
    of manifest.files
  ) {
    const filePath =
      path.join(
        repositoryRoot,
        entry.path
      );

    assert.strictEqual(
      fs.existsSync(
        filePath
      ),
      true,
      `Hiányzó manifest fájl: ${entry.path}`
    );

    assert.strictEqual(
      sha256(filePath),
      entry.sha256,
      `Eltérő SHA-256: ${entry.path}`
    );

    assert.strictEqual(
      fs.statSync(
        filePath
      ).size,
      entry.bytes,
      `Eltérő fájlméret: ${entry.path}`
    );
  }

  console.log(
    'OK: legacy adapter csomagmanifest'
  );
  console.log(
    'OK: fájlonkénti SHA-256 ellenőrzés'
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
