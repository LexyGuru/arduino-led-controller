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
  createRuntimePaths
} =
  require(
    '../server/core/runtime-paths'
  );

const {
  ReleaseFinalizationService
} =
  require(
    '../server/release/release-finalization-service'
  );

async function main() {
  const temporaryRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'release-finalization-wiring-'
      )
    );

  try {
    const paths =
      createRuntimePaths(
        {},
        temporaryRoot
      );

    for (
      const property
      of [
        'releaseExecutionReceiptDir',
        'releaseFinalizationApprovalFile'
      ]
    ) {
      assert.strictEqual(
        typeof paths[property],
        'string',
        `Hiányzó runtime útvonal: ${property}`
      );

      assert.ok(
        paths[property].trim()
      );
    }

    const gateService = {
      async readiness() {
        return {
          ready: false,
          candidateCommit:
            'a'.repeat(40),
          gate: {
            passed: false
          },
          reasons: [
            {
              code:
                'TEST_GATE_NOT_READY'
            }
          ]
        };
      }
    };

    assert.doesNotThrow(
      () =>
        new ReleaseFinalizationService({
          receiptDirectory:
            paths.releaseExecutionReceiptDir,
          approvalFile:
            paths.releaseFinalizationApprovalFile,
          gateService,
          version:
            '5.0.0-alpha.1'
        })
    );

    const serverEntry =
      fs.readFileSync(
        path.join(
          __dirname,
          '..',
          'server2_final.js'
        ),
        'utf8'
      );

    assert.match(
      serverEntry,
      /const releaseFinalizationService =/
    );

    assert.match(
      serverEntry,
      /receiptDirectory:\s*paths\.releaseExecutionReceiptDir,/
    );

    assert.match(
      serverEntry,
      /approvalFile:\s*paths\.releaseFinalizationApprovalFile,/
    );

    assert.match(
      serverEntry,
      /releaseFinalizationService,\s*alpha2OrchestrationService,\s*socketGateway,/
    );

    console.log(
      'OK: alpha.2 finalization runtime útvonalak'
    );

    console.log(
      'OK: ReleaseFinalizationService szerverindításkor létrehozható'
    );

    console.log(
      'OK: server2_final finalization service bekötés'
    );
  } finally {
    fs.rmSync(
      temporaryRoot,
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
