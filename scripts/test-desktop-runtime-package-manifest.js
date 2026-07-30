'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
        'docs/v5/PACKAGE_MANIFEST_DESKTOP_API_RUNTIME.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-desktop-api-runtime-offline-realtime-ready'
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
    seen.has(entry.path),
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
    'desktop-tauri/src/api/create-desktop-api.ts',
    'desktop-tauri/src/api/runtime/desktop-api-runtime.mjs',
    'desktop-tauri/src/api/runtime/event-stream-client.mjs',
    'desktop-tauri/src/api/react/DesktopApiContext.tsx'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest-bejegyzés: ${required}`
  );
}

console.log(
  'OK: desktop API runtime csomagmanifest'
);
console.log(
  'OK: archivált manifest séma és SHA-256 formátum'
);
