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
  createExecutionReceipt,
  sha256File,
  validateExecutionReceipt,
  writeJsonAtomic
} =
  require(
    '../server/release/release-execution-receipt'
  );

function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'alpha2-receipts-'
      )
    );

  const commit =
    'a'.repeat(40);

  const now =
    '2026-07-29T12:00:00.000Z';

  try {
    const evidence = {
      currentVersion:
        '5.0.0-alpha.1',
      targetVersion:
        '5.0.0-alpha.2',
      phase:
        'staging',
      commit,
      evidenceSha256:
        'b'.repeat(64),
      gate: {
        passed: true
      },
      promotion: {
        approved: false
      }
    };

    const evidenceFile =
      path.join(
        root,
        'evidence.json'
      );

    writeJsonAtomic(
      evidenceFile,
      evidence
    );

    const staging =
      createExecutionReceipt({
        kind:
          'staging-deployment',
        metadata: {
          version:
            '5.0.0-alpha.1',
          commit
        },
        evidence,
        evidenceFile,
        finishedAt:
          now
      });

    const stagingFile =
      path.join(
        root,
        'staging-deployment.json'
      );

    writeJsonAtomic(
      stagingFile,
      staging
    );

    const rollback =
      createExecutionReceipt({
        kind:
          'rollback-rehearsal',
        metadata: {
          version:
            '5.0.0-alpha.1',
          commit
        },
        evidence,
        evidenceFile,
        previousReceiptFile:
          stagingFile,
        finishedAt:
          now
      });

    const rollbackValidation =
      validateExecutionReceipt(
        rollback,
        {
          expectedKind:
            'rollback-rehearsal',
          expectedCommit:
            commit,
          expectedPreviousSha256:
            sha256File(
              stagingFile
            ),
          now:
            Date.parse(now)
        }
      );

    assert.strictEqual(
      rollbackValidation.passed,
      true
    );

    const broken = {
      ...rollback,
      previousReceipt: {
        ...rollback.previousReceipt,
        sha256:
          'c'.repeat(64)
      }
    };

    broken.receiptSha256 =
      rollback.receiptSha256;

    assert.strictEqual(
      validateExecutionReceipt(
        broken,
        {
          expectedKind:
            'rollback-rehearsal',
          expectedCommit:
            commit,
          expectedPreviousSha256:
            sha256File(
              stagingFile
            ),
          now:
            Date.parse(now)
        }
      ).passed,
      false
    );

    console.log(
      'OK: staging és rollback receipt létrehozás'
    );

    console.log(
      'OK: SHA-256 előzménylánc és önhash ellenőrzés'
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
