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
        'docs/v5/PACKAGE_MANIFEST_ALPHA2_EXECUTION_FINALIZATION.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-alpha2-execution-receipts-finalization-ready'
);

assert.ok(
  Array.isArray(
    manifest.files
  )
);

assert.ok(
  manifest.files.length >= 30
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
    false
  );

  seen.add(
    entry.path
  );

  assert.match(
    entry.sha256,
    /^[a-f0-9]{64}$/i
  );
}

for (
  const required
  of [
    'server/release/release-execution-receipt.js',
    'server/release/release-finalization-service.js',
    'scripts/write-alpha2-execution-receipt.js',
    'desktop-tauri/src/components/v5/V5ReleaseFinalizationPanel.tsx',
    'docs/api/openapi-v2.json'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest fájl: ${required}`
  );
}

console.log(
  'OK: alpha.2 execution és finalization csomagmanifest'
);
