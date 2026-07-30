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
  isPlaceholderSecret,
  normalizedSecretValue,
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

    fs.rmSync(
      path.join(
        root,
        'unsafe.txt'
      )
    );

    fs.writeFileSync(
      path.join(
        root,
        '.env.example'
      ),
      [
        'API_V2_TOKEN=CHANGE_THIS_TO_A_LONG_RANDOM_BEARER_TOKEN',
        'OTA_PASSWORD=',
        'OTA_PORT=65280',
        'SESSION_SECRET=<GENERATE_A_RANDOM_SECRET>',
        'ADMIN_PASSWORD=placeholder',
        ''
      ].join('\n')
    );

    const placeholders =
      scanReleaseTree({
        root
      });

    assert.strictEqual(
      placeholders.passed,
      true
    );

    fs.writeFileSync(
      path.join(
        root,
        '.env.example'
      ),
      [
        'OTA_PASSWORD=',
        'OTA_PORT=65280',
        `API_V2_TOKEN=${'x'.repeat(64)}`,
        ''
      ].join('\n')
    );

    const realAssignment =
      scanReleaseTree({
        root
      });

    assert.strictEqual(
      realAssignment.passed,
      false
    );

    assert.strictEqual(
      realAssignment
        .findings.length,
      1
    );

    assert.strictEqual(
      realAssignment
        .findings[0]
        .code,
      'ENV_SECRET_ASSIGNMENT'
    );

    assert.strictEqual(
      realAssignment
        .findings[0]
        .line,
      3
    );

    assert.strictEqual(
      realAssignment
        .findings[0]
        .valueLength,
      64
    );

    assert.strictEqual(
      JSON.stringify(
        realAssignment
      ).includes(
        'x'.repeat(64)
      ),
      false
    );

    assert.strictEqual(
      isPlaceholderSecret(''),
      true
    );

    assert.strictEqual(
      isPlaceholderSecret(
        'CHANGE_THIS_TO_A_SECRET'
      ),
      true
    );

    assert.strictEqual(
      isPlaceholderSecret(
        '"<GENERATE_ME>"'
      ),
      true
    );

    assert.strictEqual(
      isPlaceholderSecret(
        'real-secret-value'
      ),
      false
    );

    assert.strictEqual(
      normalizedSecretValue(
        '"secret-value" # comment'
      ),
      'secret-value'
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

    console.log(
      'OK: üres és dokumentációs env helyőrzők engedélyezve'
    );

    console.log(
      'OK: az env scanner nem lép át a következő sorra'
    );

    console.log(
      'OK: valódi env titok továbbra is blokkolva'
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
