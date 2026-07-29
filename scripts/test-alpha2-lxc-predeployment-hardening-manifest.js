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
        'docs/v5/PACKAGE_MANIFEST_ALPHA2_LXC_PREDEPLOYMENT_HARDENING.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.package,
  'v5-alpha2-lxc-predeployment-hardening-hotfix'
);

assert.ok(
  Array.isArray(
    manifest.files
  )
);

assert.ok(
  manifest.files.length >= 10
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
    'deploy/test-alpha2-lxc.sh',
    'deploy/install-versioned-release.sh',
    'deploy/verify-versioned-release.sh',
    'deploy/install-staging-service.sh',
    'deploy/systemd/arduino-led-controller-staging.service',
    'deploy/staging.env.example'
  ]
) {
  assert.strictEqual(
    seen.has(required),
    true,
    `Hiányzó manifest fájl: ${required}`
  );
}

console.log(
  'OK: alpha.2 LXC predeployment hardening manifest'
);
