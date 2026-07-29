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
        'docs/v5/PACKAGE_MANIFEST_ALPHA2_RELEASE_INFRASTRUCTURE.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-alpha2-release-gate-staging-promotion-ready'
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
  manifest.files.length >= 40
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

  assert.ok(
    Number.isInteger(
      entry.bytes
    ) &&
    entry.bytes >= 0
  );
}

for (
  const required
  of [
    'server/release/release-gate-service.js',
    'server/api/v2/release-routes.js',
    'deploy/run-alpha2-release-gate.sh',
    'deploy/install-versioned-release.sh',
    'deploy/rollback-versioned-release.sh',
    'desktop-tauri/src/components/v5/V5ReleaseGatePanel.tsx',
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ]
) {
  assert.strictEqual(
    seen.has(
      required
    ),
    true,
    `Hiányzó manifest-bejegyzés: ${required}`
  );
}

console.log(
  'OK: alpha.2 release-gate és staging csomagmanifest'
);
console.log(
  'OK: archivált manifest séma és egyedi fájlútvonalak'
);
