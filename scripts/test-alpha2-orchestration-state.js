'use strict';

const assert =
  require('assert');

const {
  createState,
  updateState,
  validateState
} =
  require(
    '../server/release/alpha2-orchestration-state'
  );

const state =
  createState({
    candidateRef:
      'origin/feature/test',
    candidateCommit:
      'a'.repeat(40),
    baselineBranch:
      'main',
    baselineCommit:
      'b'.repeat(40),
    startedAt:
      '2026-07-29T12:00:00.000Z'
  });

assert.strictEqual(
  validateState(state)
    .passed,
  true
);

const updated =
  updateState(
    state,
    {
      phase:
        'preflight',
      phaseStatus:
        'passed',
      status:
        'awaiting-promotion',
      artifactName:
        'gateReport',
      artifactValue:
        '/tmp/gate.json',
      at:
        '2026-07-29T12:01:00.000Z'
    }
  );

assert.strictEqual(
  updated.phases
    .preflight.status,
  'passed'
);

assert.strictEqual(
  updated.artifacts
    .gateReport,
  '/tmp/gate.json'
);

assert.strictEqual(
  updated.status,
  'awaiting-promotion'
);

assert.strictEqual(
  validateState(updated)
    .passed,
  true
);

const tampered = {
  ...updated,
  status:
    'ready-for-finalization'
};

assert.strictEqual(
  validateState(tampered)
    .passed,
  false
);

console.log(
  'OK: alpha.2 orchestration state létrehozás és frissítés'
);

console.log(
  'OK: state SHA-256 módosítás felismerése'
);
