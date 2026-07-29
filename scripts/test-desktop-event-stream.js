'use strict';

const assert = require('assert');

async function main() {
  const {
    DesktopEventStream
  } =
    await import(
      '../desktop-tauri/src/api/runtime/event-stream-client.mjs'
    );

  const emitted = [];
  let scheduled = null;

  const stream =
    new DesktopEventStream({
      client: {
        async getEventsRecent() {
          return {
            success: true,
            data: {
              events: [
                {
                  id: 1,
                  topic:
                    'led.updated'
                },
                {
                  id: 1,
                  topic:
                    'led.updated'
                },
                {
                  id: 2,
                  topic:
                    'schedule.updated'
                }
              ]
            }
          };
        }
      },
      pollingIntervalMs:
        1000,
      setTimeoutFn(callback) {
        scheduled =
          callback;
        return 1;
      },
      clearTimeoutFn() {
        scheduled = null;
      }
    });

  stream.subscribe(
    (event) =>
      emitted.push(
        event.id
      )
  );

  await stream.start();

  assert.deepStrictEqual(
    emitted,
    [1, 2]
  );

  assert.strictEqual(
    stream.snapshot().mode,
    'polling'
  );

  assert.strictEqual(
    typeof scheduled,
    'function'
  );

  stream.stop();

  assert.strictEqual(
    stream.snapshot().running,
    false
  );

  console.log(
    'OK: Socket.IO nélküli realtime polling fallback'
  );
  console.log(
    'OK: eseményduplikáció-védelem és leállítás'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
