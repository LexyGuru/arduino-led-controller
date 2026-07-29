'use strict';

const assert =
  require('assert');

async function main() {
  const {
    normalizeFinalizationReadiness
  } =
    await import(
      '../desktop-tauri/src/services/v5ReleaseExecutionModels.mjs'
    );

  const normalized =
    normalizeFinalizationReadiness({
      success: true,
      data: {
        ready: true,
        projectVersion:
          '5.0.0-alpha.1',
        targetVersion:
          '5.0.0-alpha.2',
        candidateCommit:
          'a'.repeat(40),
        receipts: {
          staging: {
            present: true,
            data: {
              kind:
                'staging-deployment',
              status:
                'passed',
              commit:
                'a'.repeat(40),
              evidence: {
                phase:
                  'staging'
              }
            }
          },
          rollback: {
            present: false
          },
          promotion: {
            present: false
          }
        }
      }
    });

  assert.strictEqual(
    normalized.ready,
    true
  );

  assert.strictEqual(
    normalized.receipts
      .staging.kind,
    'staging-deployment'
  );

  assert.strictEqual(
    normalized.receipts
      .rollback.present,
    false
  );

  console.log(
    'OK: desktop finalization readiness és receipt normalizálás'
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
