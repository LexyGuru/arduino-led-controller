'use strict';

const assert = require('assert');

async function main() {
  const {
    DesktopLedApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/led-api.mjs'
    );

  const {
    DesktopScheduleApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/schedule-api.mjs'
    );

  const calls = [];

  const runtime = {
    async read(key, operation) {
      calls.push(
        ['read', key]
      );
      return operation();
    },
    async write(operation) {
      calls.push(
        ['write']
      );
      return operation();
    }
  };

  const client = {
    async getLeds() {
      return ['leds'];
    },
    async putLedsById(options) {
      return options;
    },
    async getLocalSchedules() {
      return ['schedules'];
    },
    async postLocalSchedules(options) {
      return options;
    }
  };

  const leds =
    new DesktopLedApi({
      client,
      runtime
    });

  const schedules =
    new DesktopScheduleApi({
      client,
      runtime
    });

  assert.deepStrictEqual(
    await leds.list(),
    ['leds']
  );

  const updated =
    await leds.update(
      2,
      {
        enabled: true
      }
    );

  assert.strictEqual(
    updated.path.id,
    2
  );

  assert.deepStrictEqual(
    await schedules.listLocal(),
    ['schedules']
  );

  assert.strictEqual(
    calls.filter(
      (call) =>
        call[0] ===
        'write'
    ).length,
    1
  );

  console.log(
    'OK: desktop LED és schedule domain adapter'
  );
  console.log(
    'OK: read/write runtime szétválasztás'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
