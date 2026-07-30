'use strict';

const assert =
  require('assert');

const {
  buildReleaseProvenance
} =
  require(
    '../server/release/release-provenance'
  );

function main() {
  const options = {
    version:
      '5.0.0-alpha.1',
    commit:
      'b'.repeat(40),
    generatedAt:
      '2026-07-29T10:00:00.000Z',
    phase:
      'staging'
  };

  const first =
    buildReleaseProvenance(
      options
    );

  const second =
    buildReleaseProvenance(
      options
    );

  assert.deepStrictEqual(
    first,
    second
  );

  assert.strictEqual(
    first._type,
    'https://in-toto.io/Statement/v1'
  );

  assert.strictEqual(
    first.predicateType,
    'https://slsa.dev/provenance/v1'
  );

  assert.strictEqual(
    first.subject[0]
      .digest.gitCommit,
    options.commit
  );

  assert.strictEqual(
    first.predicate
      .buildDefinition
      .externalParameters
      .targetVersion,
    '5.0.0-alpha.2'
  );

  console.log(
    'OK: determinisztikus in-toto/SLSA provenance'
  );

  console.log(
    'OK: commit, verzió és release-fázis rögzítve'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
