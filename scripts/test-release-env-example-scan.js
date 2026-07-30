'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

const path =
  require('path');

const {
  scanReleaseTree
} =
  require(
    '../server/release/release-secret-scanner'
  );

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const temporary =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'release-env-example-scan-'
    )
  );

try {
  fs.copyFileSync(
    path.join(
      ROOT,
      '.env.example'
    ),
    path.join(
      temporary,
      '.env.example'
    )
  );

  const result =
    scanReleaseTree({
      root:
        temporary
    });

  assert.strictEqual(
    result.passed,
    true,
    JSON.stringify(
      result.findings,
      null,
      2
    )
  );

  assert.strictEqual(
    result.findings.length,
    0
  );

  console.log(
    'OK: a repository .env.example fájlja nem okoz hamis titokriasztást'
  );
} finally {
  fs.rmSync(
    temporary,
    {
      recursive: true,
      force: true
    }
  );
}
