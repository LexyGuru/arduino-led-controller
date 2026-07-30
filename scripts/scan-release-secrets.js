#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  scanReleaseTree
} =
  require(
    '../server/release/release-secret-scanner'
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
          'secret-scan.json'
        )
      )
    );

  const allowlist =
    path.resolve(
      argument(
        '--allowlist',
        path.join(
          root,
          'config',
          'release-secret-allowlist.json'
        )
      )
    );

  const report =
    scanReleaseTree({
      root,
      allowlistFile:
        fs.existsSync(
          allowlist
        )
          ? allowlist
          : null
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
      report,
      null,
      2
    )}\n`
  );

  console.log(
    `Titokvizsgálat: ${output}`
  );

  console.log(
    `Vizsgált fájlok: ${report.scannedFiles}`
  );

  if (!report.passed) {
    for (
      const finding
      of report.findings
    ) {
      console.error(
        `${finding.code}: ${finding.file}:${finding.line}`
      );
    }

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
