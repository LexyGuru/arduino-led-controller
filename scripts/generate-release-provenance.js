#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  buildReleaseProvenance
} =
  require(
    '../server/release/release-provenance'
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

  const packageData =
    JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          'package.json'
        ),
        'utf8'
      )
    );

  const output =
    path.resolve(
      argument(
        '--output',
        path.join(
          root,
          'provenance.json'
        )
      )
    );

  const provenance =
    buildReleaseProvenance({
      product:
        packageData.name,
      version:
        packageData.version,
      commit:
        argument(
          '--commit',
          process.env
            .RELEASE_COMMIT ||
          ''
        ),
      generatedAt:
        argument(
          '--generated-at',
          new Date()
            .toISOString()
        ),
      phase:
        argument(
          '--phase',
          'staging'
        )
    });

  fs.mkdirSync(
    path.dirname(
      output
    ),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    output,
    `${JSON.stringify(
      provenance,
      null,
      2
    )}\n`
  );

  console.log(
    `Provenance: ${output}`
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
