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
        'docs/v5/PACKAGE_MANIFEST_DESKTOP_V5_SYSTEM_UI.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-desktop-v5-system-ui-ready'
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
    'desktop-tauri/src/pages/V5SystemPage.tsx',
    'desktop-tauri/src/hooks/useV5System.ts',
    'desktop-tauri/src/components/v5/V5ConnectionPanel.tsx',
    'desktop-tauri/src/components/v5/V5SnapshotPanel.tsx',
    'desktop-tauri/src/api/runtime/domain/system-api.mjs'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest-bejegyzés: ${required}`
  );
}

console.log(
  'OK: desktop V5 rendszer UI csomagmanifest'
);
console.log(
  'OK: archivált manifest séma és egyedi fájlútvonalak'
);
