#!/usr/bin/env node
'use strict';

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
      argumentValue(
        '--root'
      ) ||
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
    argumentValue(
      '--report'
    )
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
      `Nem található release-gate jelentés: ${reportDirectory}`
    );
  }

  const expectedCommit =
    argumentValue(
      '--expected-commit'
    ) ||
    resolveGitCommit(
      root
    );

  const maxAgeHours =
    Number(
      argumentValue(
        '--max-age-hours'
      ) ||
      process.env
        .RELEASE_GATE_MAX_AGE_HOURS ||
      72
    );

  const report =
    readGateReport(
      reportFile
    );

  const validation =
    validateGateReport(
      report,
      {
        expectedCommit,
        maxAgeHours
      }
    );

  const output = {
    ...validation,
    reportFile,
    reportSha256:
      sha256File(
        reportFile
      ),
    expectedCommit
  };

  process.stdout.write(
    `${JSON.stringify(
      output,
      null,
      2
    )}\n`
  );

  if (!validation.passed) {
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
