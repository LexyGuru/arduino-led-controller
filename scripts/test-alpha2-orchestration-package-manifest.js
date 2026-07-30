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
        'docs/v5/PACKAGE_MANIFEST_ALPHA2_LXC_ORCHESTRATOR.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-alpha2-lxc-orchestrator-guarded-ready'
);

assert.ok(
  Array.isArray(
    manifest.files
  )
);

assert.ok(
  manifest.files.length >= 35
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
    'deploy/run-alpha2-lxc-orchestrator.sh',
    'deploy/alpha2-production-guard.sh',
    'deploy/verify-alpha2-lxc-preflight.sh',
    'server/release/alpha2-orchestration-state.js',
    'server/release/alpha2-orchestration-service.js',
    'desktop-tauri/src/components/v5/V5LxcOrchestrationPanel.tsx'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest fájl: ${required}`
  );
}

console.log(
  'OK: alpha.2 LXC orchestrator csomagmanifest'
);
