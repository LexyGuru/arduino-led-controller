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
  scanReleaseTree,
  valueHash
} =
  require(
    '../server/release/release-secret-scanner'
  );

function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'release-secret-scan-'
      )
    );

  try {
    const secret =
      `ghp_${'A'.repeat(36)}`;

    fs.writeFileSync(
      path.join(
        root,
        'unsafe.txt'
      ),
      `token=${secret}\n`
    );

    const failed =
      scanReleaseTree({
        root
      });

    assert.strictEqual(
      failed.passed,
      false
    );

    assert.strictEqual(
      failed.findings[0]
        .code,
      'GITHUB_TOKEN'
    );

    assert.strictEqual(
      JSON.stringify(
        failed
      ).includes(secret),
      false
    );

    const allowlist =
      path.join(
        root,
        'allowlist.json'
      );

    fs.writeFileSync(
      allowlist,
      JSON.stringify({
        ignoredFiles: [],
        ignoredCodes: [],
        ignoredValueHashes: [
          valueHash(secret)
        ]
      })
    );

    const passed =
      scanReleaseTree({
        root,
        allowlistFile:
          allowlist
      });

    assert.strictEqual(
      passed.passed,
      true
    );

    console.log(
      'OK: release titokszivárgás felismerése'
    );

    console.log(
      'OK: jelentésben nincs nyers titokérték'
    );

    console.log(
      'OK: SHA-256 alapú célzott allowlist'
    );
  } finally {
    fs.rmSync(
      root,
      {
        recursive: true,
        force: true
      }
    );
  }
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
