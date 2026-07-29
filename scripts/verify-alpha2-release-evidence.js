#!/usr/bin/env node
'use strict';

const path =
  require('path');

const {
  verifyReleaseEvidence
} =
  require(
    '../server/release/release-evidence'
  );

function argument(
  name,
  fallback = null
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
  const root =
    path.resolve(
      argument(
        '--root',
        path.resolve(
          __dirname,
          '..'
        )
      )
    );

  const evidenceFile =
    path.resolve(
      argument(
        '--evidence'
      ) ||
      path.join(
        root,
        'release-evidence',
        'RELEASE-EVIDENCE.json'
      )
    );

  const result =
    verifyReleaseEvidence({
      root,
      evidenceFile,
      expectedCommit:
        argument(
          '--expected-commit',
          ''
        ),
      expectedPhase:
        argument(
          '--phase',
          ''
        ),
      expectedVersion:
        argument(
          '--version',
          ''
        ),
      maxAgeHours:
        Number(
          argument(
            '--max-age-hours',
            168
          )
        )
    });

  process.stdout.write(
    `${JSON.stringify(
      result,
      null,
      2
    )}\n`
  );

  if (!result.passed) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
