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
  ReleaseGateService
} =
  require(
    '../server/release/release-gate-service'
  );

function gateReport() {
  return {
    schemaVersion: 1,
    gate:
      'alpha2-lxc',
    status:
      'passed',
    startedAt:
      new Date(
        Date.now() -
        120000
      ).toISOString(),
    finishedAt:
      new Date(
        Date.now() -
        60000
      ).toISOString(),
    baselineCommit:
      'a'.repeat(40),
    candidateCommit:
      'b'.repeat(40),
    serviceName:
      'arduino-led-controller',
    hostname:
      'test-lxc',
    nodeVersion:
      process.version
  };
}

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'alpha2-release-service-'
      )
    );

  try {
    const reportDirectory =
      path.join(
        root,
        'reports'
      );

    const approvalFile =
      path.join(
        reportDirectory,
        'approval.json'
      );

    fs.mkdirSync(
      reportDirectory,
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      path.join(
        reportDirectory,
        'alpha2-test.json'
      ),
      JSON.stringify(
        gateReport()
      )
    );

    const service =
      new ReleaseGateService({
        reportDirectory,
        approvalFile,
        projectRoot:
          root,
        metadataFile:
          path.join(
            root,
            'RELEASE-METADATA.json'
          ),
        version:
          '5.0.0-alpha.1',
        targetVersion:
          '5.0.0-alpha.2',
        maxAgeHours: 72,
        preflightProvider:
          async () => ({
            ready: true,
            summary: {
              blocking: 0
            }
          }),
        maintenanceProvider:
          () => ({
            enabled: false
          }),
        migrationProvider:
          async () => ({
            pending: 0
          })
      });

    const verified =
      service.verify({
        expectedCommit:
          'b'.repeat(40)
      });

    assert.strictEqual(
      verified.passed,
      true
    );

    const readiness =
      await service.readiness();

    assert.strictEqual(
      readiness.ready,
      true
    );

    const approval =
      await service.approve({
        confirm:
          'APPROVE_ALPHA2_PROMOTION',
        principal: {
          subject:
            'admin'
        }
      });

    assert.strictEqual(
      approval.present,
      true
    );

    assert.strictEqual(
      approval.targetVersion,
      '5.0.0-alpha.2'
    );

    assert.strictEqual(
      service.approval()
        .candidateCommit,
      'b'.repeat(40)
    );

    const revoked =
      await service.revoke({
        principal: {
          subject:
            'admin'
        }
      });

    assert.strictEqual(
      revoked.revoked,
      true
    );

    assert.strictEqual(
      fs.existsSync(
        approvalFile
      ),
      false
    );

    await assert.rejects(
      service.approve({
        confirm:
          'ROSSZ'
      }),
      (error) =>
        error.code ===
        'PROMOTION_CONFIRMATION_REQUIRED'
    );

    console.log(
      'OK: alpha.2 gate verify és összesített readiness'
    );
    console.log(
      'OK: atomikus promóciós jóváhagyás és visszavonás'
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

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
