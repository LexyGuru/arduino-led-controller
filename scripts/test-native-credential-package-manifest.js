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
        'docs/v5/PACKAGE_MANIFEST_NATIVE_CREDENTIAL_BRIDGE.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-native-tauri-credential-bridge-ready'
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
  manifest.files.length >= 15
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
    'desktop-tauri/src-tauri/Cargo.toml',
    'desktop-tauri/src-tauri/src/credential_bridge.rs',
    'docs/v5/NATIVE_CREDENTIAL_BRIDGE_LIB_RS.patch',
    'desktop-tauri/src/api/runtime/credential-vault.mjs',
    'desktop-tauri/src/main.tsx'
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
  'OK: natív Tauri credential bridge csomagmanifest'
);

console.log(
  'OK: archivált manifest séma és egyedi fájlútvonalak'
);
