#!/usr/bin/env node
'use strict';

const path =
  require('path');

const {
  readJsonObject,
  receiptFileName,
  sha256File,
  validateExecutionReceipt
} =
  require(
    '../server/release/release-execution-receipt'
  );

function argument(
  name,
  fallback = ''
) {
  const index =
    process.argv
      .indexOf(name);

  return index >= 0
    ? process.argv[
        index + 1
      ]
    : fallback;
}

function main() {
  const directory =
    path.resolve(
      argument(
        '--receipt-dir',
        process.cwd()
      )
    );

  const commit =
    argument(
      '--commit'
    );

  const maxAgeHours =
    Number(
      argument(
        '--max-age-hours',
        168
      )
    );

  let previousSha = '';

  const results = {};

  for (
    const kind
    of [
      'staging-deployment',
      'rollback-rehearsal',
      'promotion-deployment'
    ]
  ) {
    const file =
      path.join(
        directory,
        receiptFileName(
          kind
        )
      );

    const validation =
      validateExecutionReceipt(
        readJsonObject(file),
        {
          expectedKind:
            kind,
          expectedCommit:
            commit,
          expectedPreviousSha256:
            kind ===
              'staging-deployment'
              ? ''
              : previousSha,
          maxAgeHours
        }
      );

    results[kind] =
      validation;

    if (!validation.passed) {
      process.stdout.write(
        `${JSON.stringify(
          results,
          null,
          2
        )}\n`
      );

      process.exitCode = 1;
      return;
    }

    previousSha =
      sha256File(file);
  }

  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      results
    }, null, 2)}\n`
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
