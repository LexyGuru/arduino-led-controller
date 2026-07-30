'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const manifest =
  JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'docs/v5/PACKAGE_MANIFEST_RELEASE_SECRET_ENV_HOTFIX.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-release-secret-scanner-env-placeholder-hotfix'
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
    'server/release/release-secret-scanner.js',
    'scripts/build-alpha2-release-evidence.js',
    'scripts/test-release-secret-scanner.js',
    'scripts/test-release-env-example-scan.js',
    'scripts/test-release-secret-diagnostics.js'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest fájl: ${required}`
  );
}

console.log(
  'OK: release secret env hotfix csomagmanifest'
);
