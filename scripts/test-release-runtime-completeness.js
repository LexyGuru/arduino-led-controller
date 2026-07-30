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
  validateState
} =
  require(
    '../server/release/alpha2-orchestration-state'
  );

const {
  ReleaseGateService
} =
  require(
    '../server/release/release-gate-service'
  );

const {
  ReleaseFinalizationService
} =
  require(
    '../server/release/release-finalization-service'
  );

const {
  Alpha2OrchestrationService
} =
  require(
    '../server/release/alpha2-orchestration-service'
  );

const temporary =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'release-runtime-completeness-'
    )
  );

try {
  const state =
    createState({
      candidateRef:
        'origin/feature/test',
      candidateCommit:
        'a'.repeat(40),
      baselineBranch:
        'main',
      baselineCommit:
        'b'.repeat(40)
    });

  assert.strictEqual(
    validateState(state)
      .passed,
    true
  );

  const gateService =
    new ReleaseGateService({
      reportDirectory:
        path.join(
          temporary,
          'reports'
        ),
      approvalFile:
        path.join(
          temporary,
          'approval.json'
        ),
      projectRoot:
        temporary,
      metadataFile:
        path.join(
          temporary,
          'metadata.json'
        ),
      targetVersion:
        '5.0.0-alpha.2'
    });

  assert.ok(
    gateService
  );

  const finalizationService =
    new ReleaseFinalizationService({
      receiptDirectory:
        path.join(
          temporary,
          'receipts'
        ),
      approvalFile:
        path.join(
          temporary,
          'finalization.json'
        ),
      gateService: {
        async readiness() {
          return {
            ready: false,
            reasons: []
          };
        }
      },
      version:
        '5.0.0-alpha.1'
    });

  assert.ok(
    finalizationService
  );

  const orchestrationService =
    new Alpha2OrchestrationService({
      stateFile:
        path.join(
          temporary,
          'state.json'
        ),
      artifactIndexFile:
        path.join(
          temporary,
          'index.json'
        ),
      productionGuardFile:
        path.join(
          temporary,
          'guard.json'
        ),
      productionGuardVerificationFile:
        path.join(
          temporary,
          'guard-verification.json'
        ),
      receiptDirectory:
        path.join(
          temporary,
          'receipts'
        )
    });

  assert.ok(
    orchestrationService
  );

  console.log(
    'OK: teljes release runtime modulkészlet betölthető'
  );

  console.log(
    'OK: gate, finalization és orchestration service létrehozható'
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
