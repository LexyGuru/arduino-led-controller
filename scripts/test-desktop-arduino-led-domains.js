'use strict';

const assert =
  require('assert');

async function main() {
  const {
    DesktopArduinoApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/arduino-api.mjs'
    );

  const {
    DesktopLedApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/led-api.mjs'
    );

  const calls = [];

  const client =
    new Proxy(
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
                property
            };
          };
        }
      }
    );

  const runtime = {
    async read(
      key,
      operation,
      options
    ) {
      calls.push({
        read: key,
        options
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

  const arduino =
    new DesktopArduinoApi({
      client,
      runtime
    });

  const leds =
    new DesktopLedApi({
      client,
      runtime
    });

  await arduino.status();
  await arduino.monitor();
  await arduino.pollMonitor();
  await leds.list();
  await leds.update(
    2,
    {
      enabled: true
    }
  );
  await leds.updateMany([
    {
      id: 1,
      command: {
        enabled: true
      }
    },
    {
      id: 3,
      command: {
        enabled: false
      }
    }
  ]);
  await leds.allOn();
  await leds.allOff();
  await leds.reset();

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
      'getArduinoStatus',
      'getArduinoMonitor',
      'postArduinoMonitorActionsPoll',
      'getLeds',
      'putLedsById',
      'postLedsActionsAllOn',
      'postLedsActionsAllOff',
      'postLedsActionsReset'
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

  assert.strictEqual(
    operations.filter(
      (item) =>
        item ===
        'putLedsById'
    ).length,
    3
  );

  console.log(
    'OK: Arduino status és monitor desktop domain'
  );
  console.log(
    'OK: LED list/update/bulk/reset desktop domain'
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
