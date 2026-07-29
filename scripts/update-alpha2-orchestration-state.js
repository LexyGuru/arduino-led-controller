#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  createState,
  readState,
  updateState,
  validateState,
  writeState
} =
  require(
    '../server/release/alpha2-orchestration-state'
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

function has(
  name
) {
  return process.argv
    .includes(name);
}

function main() {
  const file =
    path.resolve(
      argument(
        '--file'
      ) ||
      ''
    );

  if (!file) {
    throw new Error(
      'A --file kötelező.'
    );
  }

  if (
    has('--initialize')
  ) {
    const state =
      createState({
        candidateRef:
          argument(
            '--candidate-ref'
          ),
        candidateCommit:
          argument(
            '--candidate-commit'
          ),
        baselineBranch:
          argument(
            '--baseline-branch'
          ),
        baselineCommit:
          argument(
            '--baseline-commit'
          )
      });

    writeState(
      file,
      state
    );

    process.stdout.write(
      `${JSON.stringify(
        state,
        null,
        2
      )}\n`
    );

    return;
  }

  const state =
    readState(file);

  if (
    has('--verify')
  ) {
    const validation =
      validateState(
        state,
        {
          expectedCommit:
            argument(
              '--expected-commit'
            )
        }
      );

    process.stdout.write(
      `${JSON.stringify(
        validation,
        null,
        2
      )}\n`
    );

    if (!validation.passed) {
      process.exitCode = 1;
    }

    return;
  }

  const next =
    updateState(
      state,
      {
        phase:
          argument('--phase'),
        phaseStatus:
          argument(
            '--phase-status'
          ),
        status:
          argument('--status'),
        message:
          argument('--message'),
        artifactName:
          argument(
            '--artifact-name'
          ),
        artifactValue:
          argument(
            '--artifact-value'
          ),
        errorCode:
          argument(
            '--error-code'
          ),
        errorMessage:
          argument(
            '--error-message'
          )
      }
    );

  writeState(
    file,
    next
  );

  process.stdout.write(
    `${JSON.stringify(
      next,
      null,
      2
    )}\n`
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
