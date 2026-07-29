'use strict';

const assert =
  require('assert');

const {
  commitsMatch,
  validateGateReport
} =
  require(
    '../server/release/release-gate-report'
  );

function report(
  overrides = {}
) {
  return {
    schemaVersion: 1,
    gate:
      'alpha2-lxc',
    status:
      'passed',
    startedAt:
      new Date(
        Date.now() -
        120000
      ).toISOString(),
    finishedAt:
      new Date(
        Date.now() -
        60000
      ).toISOString(),
    baselineCommit:
      'a'.repeat(40),
    candidateCommit:
      'b'.repeat(40),
    serviceName:
      'arduino-led-controller',
    hostname:
      'test-lxc',
    nodeVersion:
      process.version,
    checks: [
      'candidate-endpoints',
      'rollback-test'
    ],
    ...overrides
  };
}

const valid =
  validateGateReport(
    report(),
    {
      expectedCommit:
        'b'.repeat(40),
      maxAgeHours: 72
    }
  );

assert.strictEqual(
  valid.passed,
  true
);

assert.strictEqual(
  commitsMatch(
    'b'.repeat(40),
    'b'.repeat(12)
  ),
  true
);

const mismatch =
  validateGateReport(
    report(),
    {
      expectedCommit:
        'c'.repeat(40),
      maxAgeHours: 72
    }
  );

assert.strictEqual(
  mismatch.passed,
  false
);

assert.strictEqual(
  mismatch.reasons
    .some(
      (reason) =>
        reason.code ===
        'RELEASE_GATE_COMMIT_MISMATCH'
    ),
  true
);

const expired =
  validateGateReport(
    report({
      finishedAt:
        new Date(
          Date.now() -
          100 * 60 * 60 * 1000
        ).toISOString()
    }),
    {
      expectedCommit:
        'b'.repeat(40),
      maxAgeHours: 72
    }
  );

assert.strictEqual(
  expired.reasons
    .some(
      (reason) =>
        reason.code ===
        'RELEASE_GATE_EXPIRED'
    ),
  true
);

console.log(
  'OK: alpha.2 release-gate séma, kor és commit'
);
console.log(
  'OK: rövid és teljes Git commit összehasonlítás'
);
