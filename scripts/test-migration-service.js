'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  MigrationService
} = require(
  '../server/system/migration-service'
);

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'migrations-'
      )
    );

  try {
    const paths = {
      dataDir:
        path.join(root, 'data'),
      configDir:
        path.join(root, 'config'),
      schedulesDir:
        path.join(root, 'schedules'),
      snapshotsDir:
        path.join(root, 'snapshots'),
      migrationDir:
        path.join(root, 'migrations'),
      migrationStateFile:
        path.join(
          root,
          'migrations',
          'state.json'
        ),
      maintenanceStateFile:
        path.join(
          root,
          'maintenance.json'
        )
    };

    const service =
      new MigrationService({
        paths
      });

    const dryRun =
      await service.apply({
        dryRun: true
      });

    assert.strictEqual(
      dryRun.results.some(
        (item) =>
          item.status ===
          'pending'
      ),
      true
    );

    const applied =
      await service.apply();

    assert.strictEqual(
      applied.restartRequired,
      true
    );

    const status =
      await service.status();

    assert.strictEqual(
      status.pending,
      0
    );

    console.log(
      'OK: idempotens rendszer-migrációk'
    );
    console.log(
      'OK: migration dry-run és state fájl'
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

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
