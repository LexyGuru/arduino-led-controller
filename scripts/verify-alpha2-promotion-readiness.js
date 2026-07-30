#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  latestGateReportPath,
  readGateReport,
  resolveGitCommit,
  sha256File,
  validateGateReport
} =
  require(
    '../server/release/release-gate-report'
  );

function argumentValue(
  name
) {
  const index =
    process.argv
      .indexOf(name);

  return index >= 0
    ? process.argv[
        index + 1
      ]
    : null;
}

function main() {
  const root =
    path.resolve(
      argumentValue('--root') ||
      path.resolve(
        __dirname,
        '..'
      )
    );

  const reportDirectory =
    path.resolve(
      argumentValue(
        '--report-dir'
      ) ||
      process.env
        .RELEASE_GATE_REPORT_DIR ||
      path.join(
        root,
        'data',
        'release-gates'
      )
    );

  const reportFile =
    argumentValue('--report')
      ? path.resolve(
          argumentValue(
            '--report'
          )
        )
      : latestGateReportPath(
          reportDirectory
        );

  if (!reportFile) {
    throw new Error(
      'Nem található alpha.2 release-gate jelentés.'
    );
  }

  const expectedCommit =
    argumentValue(
      '--expected-commit'
    ) ||
    resolveGitCommit(
      root
    );

  const validation =
    validateGateReport(
      readGateReport(
        reportFile
      ),
      {
        expectedCommit,
        maxAgeHours:
          Number(
            argumentValue(
              '--max-age-hours'
            ) ||
            72
          )
      }
    );

  const output = {
    ready:
      validation.passed,
    targetVersion:
      '5.0.0-alpha.2',
    currentVersion:
      JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            'package.json'
          ),
          'utf8'
        )
      ).version,
    expectedCommit,
    reportFile,
    reportSha256:
      sha256File(
        reportFile
      ),
    validation
  };

  process.stdout.write(
    `${JSON.stringify(
      output,
      null,
      2
    )}\n`
  );

  if (!output.ready) {
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
