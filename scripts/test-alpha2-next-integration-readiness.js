'use strict';

const assert = require('assert');
const {
  EXPECTED_VERSION,
  QUALIFIED_CANDIDATE,
  evaluate
} = require('./verify-alpha2-next-integration-readiness');

function main() {
  const result = evaluate({
    checkGit: false,
    requireGit: false
  });

  assert.strictEqual(result.passed, true, JSON.stringify(result.errors));
  assert.strictEqual(result.expectedVersion, '5.0.0-alpha.2');
  assert.strictEqual(EXPECTED_VERSION, '5.0.0-alpha.2');
  assert.strictEqual(
    result.qualifiedCandidate,
    '1236becc37e9b4d8ed2334f3cd60b455c248e82d'
  );
  assert.strictEqual(result.qualifiedCandidate, QUALIFIED_CANDIDATE);
  assert.ok(result.checks.length >= 9);
  assert.ok(result.checks.every((check) => check.ok));

  console.log('OK: Alpha.2 verzió- és dokumentációs readiness');
  console.log('OK: PR #1 dokumentált, next és main merge kapuk nyitva maradnak');
  console.log('OK: minősített runtime candidate változatlan');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
