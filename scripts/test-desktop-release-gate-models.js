'use strict';

const assert =
  require('assert');

async function main() {
  const {
    normalizePromotionReadiness,
    normalizeReleaseGate
  } =
    await import(
      '../desktop-tauri/src/services/v5ReleaseGateModels.mjs'
    );

  const gate =
    normalizeReleaseGate({
      success: true,
      data: {
        passed: true,
        projectVersion:
          '5.0.0-alpha.1',
        targetVersion:
          '5.0.0-alpha.2',
        candidateCommit:
          'a'.repeat(40),
        report: {
          fileName:
            'alpha2.json'
        }
      }
    });

  assert.strictEqual(
    gate.passed,
    true
  );

  const readiness =
    normalizePromotionReadiness({
      source: 'network',
      data: {
        success: true,
        data: {
          ready: false,
          targetVersion:
            '5.0.0-alpha.2',
          reasons: [
            {
              code:
                'PENDING_MIGRATIONS'
            }
          ],
          gate
        }
      }
    });

  assert.strictEqual(
    readiness.ready,
    false
  );

  assert.strictEqual(
    readiness.reasons[0]
      .code,
    'PENDING_MIGRATIONS'
  );

  console.log(
    'OK: release-gate és promóciós readiness normalizálás'
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
