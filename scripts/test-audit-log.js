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
  AuditLog,
  redactValue
} = require(
  '../server/observability/audit-log'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'audit-log-'
      )
    );

  try {
    const audit =
      new AuditLog({
        filePath:
          path.join(
            tempRoot,
            'audit.jsonl'
          )
      });

    await audit.record({
      action:
        'user.create',
      principal: {
        subject:
          'admin',
        type:
          'user-session',
        role:
          'admin'
      },
      details: {
        username:
          'operator',
        password:
          'must-not-appear',
        nested: {
          apiToken:
            'must-not-appear'
        }
      }
    });

    await audit.flush();

    const recent =
      await audit.recent(
        10
      );

    assert.strictEqual(
      recent.length,
      1
    );

    assert.strictEqual(
      recent[0]
        .details
        .password,
      '[REDACTED]'
    );

    assert.strictEqual(
      recent[0]
        .details
        .nested
        .apiToken,
      '[REDACTED]'
    );

    assert.strictEqual(
      redactValue({
        otaPassword:
          'secret'
      }).otaPassword,
      '[REDACTED]'
    );

    const rotatingAudit =
      new AuditLog({
        filePath:
          path.join(
            tempRoot,
            'rotating-audit.jsonl'
          ),
        maximumBytes:
          64 * 1024,
        maximumArchives:
          1
      });

    for (
      let index = 0;
      index < 80;
      index += 1
    ) {
      await rotatingAudit.record({
        action:
          'rotation.test',
        details: {
          index,
          payload:
            'x'.repeat(2000)
        }
      });
    }

    await rotatingAudit.flush();

    const rotationStats =
      await rotatingAudit.stats();

    const archiveFiles =
      fs.readdirSync(tempRoot)
        .filter(
          (name) =>
            name.startsWith(
              'rotating-audit.jsonl.'
            ) &&
            name.endsWith('.jsonl')
        );

    assert.strictEqual(
      rotationStats.rotationCount >= 1,
      true
    );

    assert.strictEqual(
      archiveFiles.length <= 1,
      true
    );

    console.log(
      'OK: atomikus audit írási sor'
    );
    console.log(
      'OK: jelszó-, token- és titokredakció'
    );
    console.log(
      'OK: audit recent és állapot'
    );
    console.log(
      'OK: korlátozott auditnapló-archívumok'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
