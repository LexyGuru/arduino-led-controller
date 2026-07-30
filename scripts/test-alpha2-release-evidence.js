'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

const path =
  require('path');

const {
  buildReleaseEvidence,
  verifyReleaseEvidence,
  writeJsonAtomic
} =
  require(
    '../server/release/release-evidence'
  );

function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'alpha2-evidence-'
      )
    );

  const evidenceDirectory =
    path.join(
      root,
      'release-evidence'
    );

  const commit =
    'c'.repeat(40);

  const generatedAt =
    '2026-07-29T10:00:00.000Z';

  try {
    fs.mkdirSync(
      evidenceDirectory,
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      path.join(
        root,
        'package.json'
      ),
      JSON.stringify({
        name:
          'arduino-led-controller',
        version:
          '5.0.0-alpha.1'
      })
    );

    const gateReport = {
      schemaVersion: 1,
      gate:
        'alpha2-lxc',
      startedAt:
        '2026-07-29T09:55:00.000Z',
      finishedAt:
        '2026-07-29T09:59:00.000Z',
      status:
        'passed',
      baselineCommit:
        'd'.repeat(40),
      candidateCommit:
        commit,
      serviceName:
        'arduino-led-controller',
      candidateRef:
        commit,
      hostname:
        'test-lxc',
      nodeVersion:
        'v25.9.0',
      checks: [
        'candidate-endpoints',
        'repository-validation',
        'rollback-test',
        'production-service-postcheck'
      ]
    };

    const approval = {
      schemaVersion: 1,
      approved: true,
      targetVersion:
        '5.0.0-alpha.2',
      commit,
      approvedAt:
        generatedAt
    };

    for (
      const [
        name,
        value
      ]
      of [
        [
          'sbom.cdx.json',
          {
            bomFormat:
              'CycloneDX'
          }
        ],
        [
          'provenance.json',
          {
            _type:
              'https://in-toto.io/Statement/v1'
          }
        ],
        [
          'secret-scan.json',
          {
            passed: true,
            findings: []
          }
        ],
        [
          'release-gate-report.json',
          gateReport
        ],
        [
          'promotion-approval.json',
          approval
        ]
      ]
    ) {
      writeJsonAtomic(
        path.join(
          evidenceDirectory,
          name
        ),
        value
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
          path.join(
            evidenceDirectory,
            'promotion-approval.json'
          ),
        phase:
          'promotion',
        commit,
        generatedAt
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

    const verification =
      verifyReleaseEvidence({
        root,
        evidenceFile,
        expectedCommit:
          commit,
        expectedPhase:
          'promotion',
        expectedVersion:
          '5.0.0-alpha.1',
        now:
          Date.parse(
            generatedAt
          )
      });

    assert.strictEqual(
      verification.passed,
      true
    );

    fs.appendFileSync(
      path.join(
        evidenceDirectory,
        'sbom.cdx.json'
      ),
      'tamper'
    );

    const tampered =
      verifyReleaseEvidence({
        root,
        evidenceFile,
        expectedCommit:
          commit,
        now:
          Date.parse(
            generatedAt
          )
      });

    assert.strictEqual(
      tampered.passed,
      false
    );

    assert.strictEqual(
      tampered.reasons.some(
        (reason) =>
          reason.code ===
          'EVIDENCE_ARTIFACT_HASH_MISMATCH'
      ),
      true
    );

    console.log(
      'OK: gate és promóciós approval evidence-lánc'
    );

    console.log(
      'OK: artifact SHA-256 módosítás felismerése'
    );
  } finally {
    fs.rmSync(
      root,
      {
        recursive: true,
        force: true
      }
    );
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
