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
  writeJsonAtomic
} =
  require(
    '../server/release/release-execution-receipt'
  );

const {
  FINALIZATION_CONFIRMATION,
  ReleaseFinalizationService
} =
  require(
    '../server/release/release-finalization-service'
  );

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'alpha2-finalization-'
      )
    );

  const commit =
    'd'.repeat(40);

  const now =
    new Date()
      .toISOString();

  try {
    const evidenceFiles = {};

    for (
      const phase
      of [
        'staging',
        'promotion'
      ]
    ) {
      const file =
        path.join(
          root,
          `${phase}-evidence.json`
        );

      writeJsonAtomic(
        file,
        {
          currentVersion:
            '5.0.0-alpha.1',
          targetVersion:
            '5.0.0-alpha.2',
          phase,
          commit,
          evidenceSha256:
            phase.repeat(8)
              .slice(0, 64)
              .padEnd(
                64,
                'e'
              ),
          gate: {
            passed: true
          },
          promotion: {
            approved:
              phase ===
              'promotion'
          }
        }
      );

      evidenceFiles[phase] =
        file;
    }

    const receiptDir =
      path.join(
        root,
        'receipts'
      );

    fs.mkdirSync(
      receiptDir,
      {
        recursive: true
      }
    );

    let previous = '';

    for (
      const [
        kind,
        phase
      ]
      of [
        [
          'staging-deployment',
          'staging'
        ],
        [
          'rollback-rehearsal',
          'staging'
        ],
        [
          'promotion-deployment',
          'promotion'
        ]
      ]
    ) {
      const evidence =
        JSON.parse(
          fs.readFileSync(
            evidenceFiles[phase],
            'utf8'
          )
        );

      const file =
        path.join(
          receiptDir,
          kind ===
            'staging-deployment'
            ? 'staging-deployment.json'
            : (
                kind ===
                  'rollback-rehearsal'
                  ? 'rollback-rehearsal.json'
                  : 'promotion-deployment.json'
              )
        );

      writeJsonAtomic(
        file,
        createExecutionReceipt({
          kind,
          metadata: {
            version:
              '5.0.0-alpha.1',
            commit
          },
          evidence,
          evidenceFile:
            evidenceFiles[phase],
          previousReceiptFile:
            previous,
          finishedAt:
            now
        })
      );

      previous =
        file;
    }

    const gateService = {
      async readiness() {
        return {
          ready: true,
          candidateCommit:
            commit,
          reasons: [],
          gate: {
            passed: true
          }
        };
      }
    };

    const service =
      new ReleaseFinalizationService({
        receiptDirectory:
          receiptDir,
        approvalFile:
          path.join(
            receiptDir,
            'alpha2-finalization-approval.json'
          ),
        gateService,
        version:
          '5.0.0-alpha.1'
      });

    const readiness =
      await service
        .readiness();

    assert.strictEqual(
      readiness.ready,
      true
    );

    const approval =
      await service.approve({
        confirm:
          FINALIZATION_CONFIRMATION,
        principal: {
          subject:
            'admin'
        }
      });

    assert.strictEqual(
      approval.approved,
      true
    );

    assert.strictEqual(
      service.approval()
        .present,
      true
    );

    await service.revoke({
      principal: {
        subject:
          'admin'
      }
    });

    assert.strictEqual(
      service.approval()
        .present,
      false
    );

    console.log(
      'OK: teljes staging–rollback–promotion receipt-lánc'
    );

    console.log(
      'OK: véglegesítési readiness, approve és revoke'
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

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );

    process.exitCode = 1;
  }
);
