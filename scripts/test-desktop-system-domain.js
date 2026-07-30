'use strict';

const assert =
  require('assert');

async function main() {
  const {
    DesktopSystemApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/system-api.mjs'
    );

  const calls = [];

  const client = new Proxy(
    {},
    {
      get(
        target,
        property
      ) {
        return async (
          options = {}
        ) => {
          calls.push({
            property,
            options
          });

          return {
            operation:
              property,
            options
          };
        };
      }
    }
  );

  const runtime = {
    async read(
      key,
      operation
    ) {
      calls.push({
        read: key
      });

      return operation();
    },

    async write(
      operation
    ) {
      calls.push({
        write: true
      });

      return operation();
    }
  };

  const api =
    new DesktopSystemApi({
      client,
      runtime
    });

  await api.release();
  await api.preflight();
  await api.enableMaintenance(
    'Teszt'
  );
  await api.createSnapshot(
    'kézi'
  );
  await api.verifySnapshot(
    'snapshot-id'
  );
  await api.restoreSnapshot(
    'snapshot-id'
  );
  await api.deleteSnapshot(
    'snapshot-id'
  );
  await api.dryRunMigrations();
  await api.applyMigrations();

  const operations =
    calls
      .filter(
        (item) =>
          item.property
      )
      .map(
        (item) =>
          item.property
      );

  for (
    const required
    of [
      'getSystemRelease',
      'getSystemPreflight',
      'enableMaintenanceMode',
      'createSystemSnapshot',
      'verifySystemSnapshot',
      'restoreSystemSnapshot',
      'deleteSystemSnapshot',
      'dryRunSystemMigrations',
      'applySystemMigrations'
    ]
  ) {
    assert.strictEqual(
      operations.includes(
        required
      ),
      true,
      `Hiányzó művelet: ${required}`
    );
  }

  const restoreCall =
    calls.find(
      (item) =>
        item.property ===
        'restoreSystemSnapshot'
    );

  assert.strictEqual(
    restoreCall.options
      .body.confirm,
    'RESTORE_SYSTEM_SNAPSHOT'
  );

  console.log(
    'OK: teljes desktop rendszerüzemeltetési domain API'
  );
  console.log(
    'OK: maintenance-köteles snapshot restore megerősítés'
  );
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
