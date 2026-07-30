'use strict';

const assert = require('assert');

async function main() {
  const {
    ConnectivityStore
  } =
    await import(
      '../desktop-tauri/src/api/runtime/connectivity-store.mjs'
    );

  let index = 0;

  const store =
    new ConnectivityStore({
      now() {
        index += 1;
        return new Date(
          `2026-07-29T08:00:0${index}.000Z`
        );
      }
    });

  const states = [];

  const unsubscribe =
    store.subscribe(
      (state) =>
        states.push(
          state.status
        )
    );

  store.markChecking();
  store.markOffline(
    new Error(
      'Nincs kapcsolat'
    )
  );
  store.markChecking({
    reconnecting: true
  });
  store.markOnline();

  unsubscribe();

  assert.deepStrictEqual(
    states,
    [
      'idle',
      'checking',
      'offline',
      'reconnecting',
      'online'
    ]
  );

  assert.strictEqual(
    store.snapshot()
      .consecutiveFailures,
    0
  );

  console.log(
    'OK: desktop online/offline állapotgép'
  );
  console.log(
    'OK: reconnect és hibaszámláló'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
