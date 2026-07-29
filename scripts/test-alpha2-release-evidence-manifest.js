'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const manifest =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'docs/v5/PACKAGE_MANIFEST_ALPHA2_RELEASE_EVIDENCE.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-alpha2-release-evidence-sbom-provenance-ready'
);

assert.strictEqual(
  manifest.manifestPolicy,
  'archive-schema-only-after-supersession'
);

assert.ok(
  Array.isArray(
    manifest.files
  )
);

assert.ok(
  manifest.files.length >= 25
);

const seen =
  new Set();

for (
  const entry
  of manifest.files
) {
  assert.strictEqual(
    seen.has(
      entry.path
    ),
    false,
    `Duplikált útvonal: ${entry.path}`
  );

  seen.add(
    entry.path
  );

  assert.match(
    entry.sha256,
    /^[a-f0-9]{64}$/i,
    `Érvénytelen SHA-256: ${entry.path}`
  );
}

for (
  const required
  of [
    'server/release/release-evidence.js',
    'server/release/release-sbom.js',
    'server/release/release-provenance.js',
    'server/release/release-secret-scanner.js',
    'deploy/build-alpha2-release-bundle.sh',
    'deploy/verify-alpha2-release-bundle.sh',
    'deploy/rehearse-alpha2-rollback.sh'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest-bejegyzés: ${required}`
  );
}

console.log(
  'OK: alpha.2 release evidence csomagmanifest'
);

console.log(
  'OK: archivált manifest séma és egyedi fájlútvonalak'
);
