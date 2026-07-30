
'use strict';

const assert = require('assert');
const {
  EXPECTED_VERSION,
  ALPHA2_VERSION,
  QUALIFIED_CANDIDATE,
  evaluate
} = require('./verify-alpha2-next-integration-readiness');

function main() {
  const result = evaluate({
    checkGit: false,
    requireGit: false
  });

  assert.strictEqual(result.passed, true, JSON.stringify(result.errors));
  assert.strictEqual(result.expectedVersion, '5.0.0-alpha.3');
  assert.strictEqual(EXPECTED_VERSION, '5.0.0-alpha.3');
  assert.strictEqual(result.alpha2Version, '5.0.0-alpha.2');
  assert.strictEqual(ALPHA2_VERSION, '5.0.0-alpha.2');
  assert.strictEqual(
    result.qualifiedCandidate,
    '1236becc37e9b4d8ed2334f3cd60b455c248e82d'
  );
  assert.strictEqual(result.qualifiedCandidate, QUALIFIED_CANDIDATE);
  assert.ok(result.checks.length >= 9);
  assert.ok(result.checks.every((check) => check.ok));

  console.log('OK: Alpha.2 történeti readiness bizonyíték megmaradt');
  console.log('OK: Alpha.3 verzió- és dokumentációs állapot konzisztens');
  console.log('OK: Alpha.2 és Alpha.3 a next ágon, main továbbra is nyitott kapu');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
