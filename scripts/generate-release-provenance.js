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

  const targetVersion =
    argument(
      '--target-version',
      null
    );

  const builderId =
    argument(
      '--builder-id',
      null
    );

  const dependencyInstall =
    argument(
      '--dependency-install',
      null
    );

  const byproductsValue =
    argument(
      '--byproducts',
      null
    );

  const provenanceOptions = {
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
  };

  if (targetVersion) {
    provenanceOptions.targetVersion =
      targetVersion;
  }

  if (builderId) {
    provenanceOptions.builderId =
      builderId;
  }

  if (dependencyInstall) {
    provenanceOptions.dependencyInstall =
      dependencyInstall;
  }

  if (byproductsValue) {
    provenanceOptions.byproducts =
      byproductsValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
  }

  const provenance =
    buildReleaseProvenance(
      provenanceOptions
    );

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
