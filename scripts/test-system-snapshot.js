'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  SystemSnapshotService
} = require(
  '../server/system/snapshot-service'
);

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'snapshot-'
      )
    );

  try {
    const configDir =
      path.join(
        root,
        'config'
      );

    const schedulesDir =
      path.join(
        root,
        'schedules'
      );

    fs.mkdirSync(
      configDir,
      {
        recursive: true
      }
    );

    fs.mkdirSync(
      schedulesDir,
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      path.join(
        configDir,
        'settings.json'
      ),
      '{"value":1}\n'
    );

    fs.writeFileSync(
      path.join(
        schedulesDir,
        'weekly.json'
      ),
      '[]\n'
    );

    const service =
      new SystemSnapshotService({
        snapshotsDir:
          path.join(
            root,
            'snapshots'
          ),
        sources: [
          {
            name: 'config',
            path:
              configDir
          },
          {
            name: 'schedules',
            path:
              schedulesDir
          }
        ]
      });

    const created =
      await service.create({
        label:
          'Teszt snapshot'
      });

    assert.strictEqual(
      created.files.length,
      2
    );

    const verified =
      await service.verify(
        created.id
      );

    assert.strictEqual(
      verified.ok,
      true
    );

    fs.writeFileSync(
      path.join(
        configDir,
        'settings.json'
      ),
      '{"value":2}\n'
    );

    const restored =
      await service.restore(
        created.id,
        {
          confirm:
            'RESTORE_SYSTEM_SNAPSHOT',
          maintenanceService: {
            isEnabled() {
              return true;
            }
          }
        }
      );

    assert.strictEqual(
      restored.restartRequired,
      true
    );

    assert.strictEqual(
      fs.readFileSync(
        path.join(
          configDir,
          'settings.json'
        ),
        'utf8'
      ),
      '{"value":1}\n'
    );

    console.log(
      'OK: verziózott rendszer-snapshot'
    );
    console.log(
      'OK: snapshot SHA-256 ellenőrzés és restore'
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
