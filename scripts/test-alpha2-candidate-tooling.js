'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const required = [
    'deploy/test-alpha2-lxc.sh',
    'deploy/build-versioned-release.sh',
    'deploy/verify-versioned-release.sh',
    'docs/v5/ALPHA2_LXC_GATE_RUNBOOK.md',
    'docs/v5/ALPHA2_RELEASE_CANDIDATE.md',
    'docs/v5/TYPESCRIPT_API_CLIENT.md',
    'docs/v5/FIRMWARE_BACKUP_ROLLBACK.md'
  ];

  for (const relative of required) {
    assert.strictEqual(
      fs.existsSync(path.join(ROOT, relative)),
      true,
      `Hiányzó alpha.2 candidate fájl: ${relative}`
    );
  }

  const lxc = fs.readFileSync(
    path.join(ROOT, 'deploy/test-alpha2-lxc.sh'),
    'utf8'
  );

  assert.match(lxc, /test-alpha2-candidate\.sh/);
  assert.match(lxc, /systemctl is-active/);
  assert.match(lxc, /release-gates/);

  const build = fs.readFileSync(
    path.join(ROOT, 'deploy/build-versioned-release.sh'),
    'utf8'
  );

  assert.match(build, /git .*archive/s);
  assert.match(build, /RELEASE-METADATA\.json/);
  assert.match(build, /shasum -a 256/);

  console.log('OK: valódi LXC alpha.2 gate wrapper');
  console.log('OK: gépi release-gate jelentés');
  console.log('OK: verziózott release bundle és SHA-256');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
