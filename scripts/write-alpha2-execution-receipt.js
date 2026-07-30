#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  createExecutionReceipt,
  readJsonObject,
  writeJsonAtomic
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

function required(
  name
) {
  const value =
    argument(name);

  if (!value) {
    throw new Error(
      `Hiányzó argumentum: ${name}`
    );
  }

  return value;
}

function main() {
  const metadataFile =
    path.resolve(
      required(
        '--metadata'
      )
    );

  const evidenceFile =
    path.resolve(
      required(
        '--evidence'
      )
    );

  const output =
    path.resolve(
      required(
        '--output'
      )
    );

  const previous =
    argument(
      '--previous'
    );

  const receipt =
    createExecutionReceipt({
      kind:
        required('--kind'),
      metadata:
        readJsonObject(
          metadataFile
        ),
      evidence:
        readJsonObject(
          evidenceFile
        ),
      evidenceFile,
      status:
        argument(
          '--status',
          'passed'
        ),
      serviceName:
        argument(
          '--service'
        ),
      healthUrl:
        argument(
          '--health-url'
        ),
      previousReceiptFile:
        previous
          ? path.resolve(
              previous
            )
          : '',
      previousRelease:
        argument(
          '--previous-release'
        ),
      currentRelease:
        argument(
          '--current-release'
        ),
      startedAt:
        argument(
          '--started-at',
          new Date()
            .toISOString()
        ),
      finishedAt:
        argument(
          '--finished-at',
          new Date()
            .toISOString()
        ),
      actor:
        argument(
          '--actor',
          process.env.USER ||
          'system'
        )
    });

  writeJsonAtomic(
    output,
    receipt
  );

  console.log(
    `Execution receipt: ${output}`
  );

  console.log(
    `Receipt SHA-256: ${receipt.receiptSha256}`
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
