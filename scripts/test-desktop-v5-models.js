'use strict';

const assert =
  require('assert');

async function main() {
  const {
    normalizeMaintenance,
    normalizeMigrations,
    normalizePreflight,
    normalizeRelease,
    normalizeSnapshots
  } =
    await import(
      '../desktop-tauri/src/services/v5SystemModels.mjs'
    );

  const release =
    normalizeRelease({
      success: true,
      data: {
        version:
          '5.0.0-alpha.1',
        lifecycle: {
          state:
            'ready'
        },
        migrations: {
          pending: 2
        },
        release: {
          channel:
            'alpha'
        }
      }
    });

  assert.strictEqual(
    release.lifecycle,
    'ready'
  );

  assert.strictEqual(
    release.migrationPending,
    2
  );

  const preflight =
    normalizePreflight({
      data: {
        success: true,
        data: {
          ready: false,
          checks: [
            {
              name: 'one',
              ok: true
            },
            {
              name: 'two',
              ok: false,
              severity:
                'warning'
            },
            {
              name: 'three',
              ok: false
            }
          ]
        }
      },
      source:
        'network'
    });

  assert.strictEqual(
    preflight.summary
      .blocking,
    1
  );

  assert.strictEqual(
    preflight.summary
      .warnings,
    1
  );

  assert.deepStrictEqual(
    normalizeMaintenance({
      enabled: true,
      reason: 'Teszt'
    }),
    {
      enabled: true,
      reason: 'Teszt',
      enabledAt: null,
      enabledBy: null
    }
  );

  assert.strictEqual(
    normalizeSnapshots([
      {
        id: 'snap',
        files: 4
      }
    ])[0].files,
    4
  );

  assert.strictEqual(
    normalizeMigrations({
      migrations: [
        {
          required: true
        }
      ]
    }).pending,
    1
  );

  console.log(
    'OK: release, preflight és maintenance view-model'
  );
  console.log(
    'OK: snapshot és migráció normalizálás'
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
