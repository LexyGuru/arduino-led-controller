'use strict';

const assert = require('assert');

async function main() {
  const {
    ConnectivityStore
  } =
    await import(
      '../desktop-tauri/src/api/runtime/connectivity-store.mjs'
    );

  const {
    OfflineReadCache
  } =
    await import(
      '../desktop-tauri/src/api/runtime/offline-read-cache.mjs'
    );

  const {
    DesktopApiRuntime
  } =
    await import(
      '../desktop-tauri/src/api/runtime/desktop-api-runtime.mjs'
    );

  const connectivity =
    new ConnectivityStore();

  const runtime =
    new DesktopApiRuntime({
      client: {
        async getSystemHealth() {
          return {
            ok: true
          };
        }
      },
      auth: {
        snapshot() {
          return {};
        }
      },
      connectivity,
      eventStream: {
        async start() {},
        stop() {},
        snapshot() {
          return {};
        }
      },
      cache:
        new OfflineReadCache({
          defaultTtlMs:
            1
        })
    });

  const online =
    await runtime.read(
      'test',
      async () => ({
        value: 1
      })
    );

  assert.strictEqual(
    online.source,
    'network'
  );

  const cached =
    await runtime.read(
      'test',
      async () => {
        const error =
          new Error(
            'offline'
          );
        error.code =
          'ECONNREFUSED';
        throw error;
      }
    );

  assert.strictEqual(
    cached.source,
    'cache'
  );

  assert.strictEqual(
    connectivity
      .snapshot()
      .online,
    false
  );

  await assert.rejects(
    runtime.write(
      async () => ({
        changed: true
      })
    ),
    (error) =>
      error.code ===
      'OFFLINE_WRITE_BLOCKED'
  );

  console.log(
    'OK: offline read cache visszaesés'
  );
  console.log(
    'OK: veszélyes offline írások tiltása'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
