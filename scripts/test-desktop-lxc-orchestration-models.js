'use strict';

const assert =
  require('assert');

async function main() {
  const {
    normalizeLxcOrchestration
  } =
    await import(
      '../desktop-tauri/src/services/v5LxcOrchestrationModels.mjs'
    );

  const value =
    normalizeLxcOrchestration({
      success: true,
      data: {
        present: true,
        readyForPromotion: true,
        guardPassed: true,
        state: {
          status:
            'awaiting-promotion',
          currentPhase:
            'artifact-collection',
          candidateCommit:
            'a'.repeat(40),
          phases: {
            preflight: {
              status:
                'passed',
              message:
                'OK'
            }
          }
        }
      }
    });

  assert.strictEqual(
    value.present,
    true
  );

  assert.strictEqual(
    value.readyForPromotion,
    true
  );

  assert.strictEqual(
    value.phases[0]
      .status,
    'passed'
  );

  console.log(
    'OK: desktop LXC orchestration normalizálás'
  );
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );

    process.exitCode = 1;
  }
);
