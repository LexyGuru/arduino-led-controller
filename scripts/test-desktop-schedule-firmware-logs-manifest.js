'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(
  __dirname,
  '..'
);

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'docs/v5/PACKAGE_MANIFEST_DESKTOP_SCHEDULE_FIRMWARE_LOGS_API_V2.json'
    ),
    'utf8'
  )
);

assert.strictEqual(
  manifest.package,
  'v5-desktop-schedule-firmware-logs-api-v2-ready'
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
  manifest.files.length >= 30
);

const seen = new Set();

for (
  const entry
  of manifest.files
) {
  assert.strictEqual(
    seen.has(entry.path),
    false,
    `Duplikált útvonal: ${entry.path}`
  );

  seen.add(entry.path);

  assert.match(
    entry.sha256,
    /^[a-f0-9]{64}$/i,
    `Érvénytelen SHA-256: ${entry.path}`
  );
}

for (
  const required
  of [
    'desktop-tauri/src/pages/SchedulesPage.tsx',
    'desktop-tauri/src/pages/FirmwarePage.tsx',
    'desktop-tauri/src/pages/LogsPage.tsx',
    'desktop-tauri/src/hooks/useV5Schedules.ts',
    'desktop-tauri/src/hooks/useV5Firmware.ts',
    'desktop-tauri/src/hooks/useV5Logs.ts',
    'desktop-tauri/src/api/runtime/domain/log-api.mjs'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest-bejegyzés: ${required}`
  );
}

console.log(
  'OK: desktop schedule, firmware és napló API v2 csomagmanifest'
);
console.log(
  'OK: archivált manifest séma és egyedi fájlútvonalak'
);
