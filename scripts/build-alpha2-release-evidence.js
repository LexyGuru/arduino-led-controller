#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  buildReleaseEvidence,
  writeJsonAtomic
} =
  require(
    '../server/release/release-evidence'
  );

const {
  buildReleaseProvenance
} =
  require(
    '../server/release/release-provenance'
  );

const {
  buildReleaseSbom
} =
  require(
    '../server/release/release-sbom'
  );

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

function copyJson(
  source,
  destination
) {
  const parsed =
    JSON.parse(
      fs.readFileSync(
        source,
        'utf8'
      )
    );

  writeJsonAtomic(
    destination,
    parsed
  );
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

  const evidenceDirectory =
    path.resolve(
      argument(
        '--evidence-dir',
        path.join(
          root,
          'release-evidence'
        )
      )
    );

  const gateReportFile =
    path.resolve(
      argument(
        '--gate-report'
      ) ||
      ''
    );

  if (
    !gateReportFile ||
    !fs.existsSync(
      gateReportFile
    )
  ) {
    throw new Error(
      'A --gate-report fájl kötelező.'
    );
  }

  const approvalArgument =
    argument(
      '--approval'
    );

  const approvalFile =
    approvalArgument
      ? path.resolve(
          approvalArgument
        )
      : null;

  const phase =
    argument(
      '--phase',
      'staging'
    );

  if (
    ![
      'staging',
      'promotion'
    ].includes(
      phase
    )
  ) {
    throw new TypeError(
      'A phase staging vagy promotion legyen.'
    );
  }

  if (
    phase ===
      'promotion' &&
    (
      !approvalFile ||
      !fs.existsSync(
        approvalFile
      )
    )
  ) {
    throw new Error(
      'Promotion fázisban a --approval kötelező.'
    );
  }

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

  const commit =
    String(
      argument(
        '--commit',
        process.env
          .RELEASE_COMMIT ||
        ''
      )
    ).trim();

  const generatedAt =
    argument(
      '--generated-at',
      new Date()
        .toISOString()
    );

  fs.mkdirSync(
    evidenceDirectory,
    {
      recursive: true
    }
  );

  const allowlistFile =
    path.join(
      root,
      'config',
      'release-secret-allowlist.json'
    );

  const secretScan =
    scanReleaseTree({
      root,
      allowlistFile:
        fs.existsSync(
          allowlistFile
        )
          ? allowlistFile
          : null
    });

  writeJsonAtomic(
    path.join(
      evidenceDirectory,
      'secret-scan.json'
    ),
    secretScan
  );

  if (!secretScan.passed) {
    console.error(
      'Titokszivárgás-gyanús találatok:'
    );

    console.error(
      JSON.stringify(
        secretScan.findings,
        null,
        2
      )
    );

    throw new Error(
      `Titokszivárgás-gyanú: ${secretScan.findings.length} találat.`
    );
  }

  writeJsonAtomic(
    path.join(
      evidenceDirectory,
      'sbom.cdx.json'
    ),
    buildReleaseSbom({
      root,
      version:
        packageData.version,
      commit,
      generatedAt
    })
  );

  writeJsonAtomic(
    path.join(
      evidenceDirectory,
      'provenance.json'
    ),
    buildReleaseProvenance({
      product:
        packageData.name,
      version:
        packageData.version,
      commit,
      generatedAt,
      phase
    })
  );

  copyJson(
    gateReportFile,
    path.join(
      evidenceDirectory,
      'release-gate-report.json'
    )
  );

  if (approvalFile) {
    copyJson(
      approvalFile,
      path.join(
        evidenceDirectory,
        'promotion-approval.json'
      )
    );
  }

  const evidence =
    buildReleaseEvidence({
      root,
      evidenceDirectory,
      gateReportFile:
        path.join(
          evidenceDirectory,
          'release-gate-report.json'
        ),
      approvalFile:
        approvalFile
          ? path.join(
              evidenceDirectory,
              'promotion-approval.json'
            )
          : null,
      phase,
      commit,
      generatedAt,
      maxGateAgeHours:
        Number(
          argument(
            '--max-gate-age-hours',
            72
          )
        )
    });

  const evidenceFile =
    path.join(
      evidenceDirectory,
      'RELEASE-EVIDENCE.json'
    );

  writeJsonAtomic(
    evidenceFile,
    evidence
  );

  console.log(
    `Release evidence: ${evidenceFile}`
  );

  console.log(
    `Fázis: ${phase}`
  );

  console.log(
    `Evidence SHA-256: ${evidence.evidenceSha256}`
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  if (error.details) {
    console.error(
      JSON.stringify(
        error.details,
        null,
        2
      )
    );
  }

  process.exitCode = 1;
}
