#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  buildReleaseSbom
} =
  require(
    '../server/release/release-sbom'
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

  const output =
    path.resolve(
      argument(
        '--output',
        path.join(
          root,
          'sbom.cdx.json'
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

  const sbom =
    buildReleaseSbom({
      root,
      version:
        argument(
          '--version',
          packageData.version
        ),
      commit:
        argument(
          '--commit',
          process.env
            .RELEASE_COMMIT ||
          'unknown'
        ),
      generatedAt:
        argument(
          '--generated-at',
          new Date()
            .toISOString()
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
      sbom,
      null,
      2
    )}\n`
  );

  console.log(
    `SBOM: ${output}`
  );

  console.log(
    `Komponensek: ${sbom.components.length}`
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
