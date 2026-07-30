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
        'docs/v5/PACKAGE_MANIFEST_RELEASE_RUNTIME_RECOVERY.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-release-runtime-gitignore-recovery-hotfix'
);

assert.strictEqual(
  manifest.releaseRuntimeFiles,
  11
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
    '.gitignore',
    'config/release-secret-allowlist.json',
    'server/release/release-error.js',
    'server/release/release-gate-service.js',
    'server/release/release-execution-receipt.js',
    'server/release/release-finalization-service.js',
    'server/release/alpha2-orchestration-state.js',
    'server/release/alpha2-orchestration-service.js'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest fájl: ${required}`
  );
}

console.log(
  'OK: release runtime recovery csomagmanifest'
);
