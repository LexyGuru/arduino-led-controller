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
  createState,
  updateState,
  writeJsonAtomic,
  writeState
} =
  require(
    '../server/release/alpha2-orchestration-state'
  );

const {
  createExecutionReceipt
} =
  require(
    '../server/release/release-execution-receipt'
  );

const {
  Alpha2OrchestrationService
} =
  require(
    '../server/release/alpha2-orchestration-service'
  );

function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'alpha2-orchestration-service-'
      )
    );

  const receiptDirectory =
    path.join(
      root,
      'receipts'
    );

  fs.mkdirSync(
    receiptDirectory,
    {
      recursive: true
    }
  );

  const commit =
    'c'.repeat(40);

  const now =
    new Date()
      .toISOString();

  try {
    let state =
      createState({
        candidateRef:
          'origin/feature/test',
        candidateCommit:
          commit,
        baselineBranch:
          'main',
        baselineCommit:
          'd'.repeat(40),
        startedAt:
          now
      });

    state =
      updateState(
        state,
        {
          phase:
            'receipt-verification',
          phaseStatus:
            'passed',
          status:
            'awaiting-promotion',
          at:
            now
        }
      );

    const stateFile =
      path.join(
        root,
        'state.json'
      );

    writeState(
      stateFile,
      state
    );

    const evidenceFile =
      path.join(
        root,
        'evidence.json'
      );

    const evidence = {
      currentVersion:
        '5.0.0-alpha.1',
      targetVersion:
        '5.0.0-alpha.2',
      phase:
        'staging',
      commit,
      evidenceSha256:
        'e'.repeat(64),
      gate: {
        passed: true
      },
      promotion: {
        approved: false
      }
    };

    writeJsonAtomic(
      evidenceFile,
      evidence
    );

    let previous = '';

    for (
      const kind
      of [
        'staging-deployment',
        'rollback-rehearsal'
      ]
    ) {
      const file =
        path.join(
          receiptDirectory,
          kind ===
            'staging-deployment'
            ? 'staging-deployment.json'
            : 'rollback-rehearsal.json'
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
          evidenceFile,
          previousReceiptFile:
            previous,
          finishedAt:
            now
        })
      );

      previous =
        file;
    }

    const guardFile =
      path.join(
        root,
        'guard.json'
      );

    const guardVerificationFile =
      path.join(
        root,
        'guard-verification.json'
      );

    writeJsonAtomic(
      guardFile,
      {
        schemaVersion: 1
      }
    );

    writeJsonAtomic(
      guardVerificationFile,
      {
        schemaVersion: 1,
        passed: true,
        candidateCommit:
          commit
      }
    );

    const artifactIndexFile =
      path.join(
        root,
        'index.json'
      );

    writeJsonAtomic(
      artifactIndexFile,
      {
        schemaVersion: 1,
        files: []
      }
    );

    const service =
      new Alpha2OrchestrationService({
        stateFile,
        artifactIndexFile,
        productionGuardFile:
          guardFile,
        productionGuardVerificationFile:
          guardVerificationFile,
        receiptDirectory
      });

    const status =
      service.status();

    assert.strictEqual(
      status.readyForPromotion,
      true
    );

    assert.strictEqual(
      status.readyForFinalization,
      false
    );

    assert.strictEqual(
      service.verify()
        .verified,
      true
    );

    console.log(
      'OK: LXC orchestration státusz és receipt-ellenőrzés'
    );

    console.log(
      'OK: awaiting-promotion readiness'
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
