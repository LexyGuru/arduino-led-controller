'use strict';

const assert = require('assert');

const {
  LedService
} = require('../server/led/led-service');

const {
  LedValidationError
} = require('../server/led/led-error');

const {
  normalizeColor,
  normalizeLedPatch
} = require('../server/led/led-validation');

async function main() {
  const requests = [];

  const arduinoClient = {
    async request() {},
    async get(
      endpoint,
      options = {}
    ) {
      requests.push({
        endpoint,
        options
      });

      if (
        endpoint ===
        'api/led/status'
      ) {
        return {
          data: {
            strips: [
              {
                id: 1,
                enabled: true,
                brightness: 128
              },
              {
                id: 2,
                enabled: false,
                brightness: 0
              }
            ]
          },
          latencyMs: 4
        };
      }

      return {
        data: {
          success: true
        },
        latencyMs: 3
      };
    }
  };

  const service =
    new LedService({
      arduinoClient
    });

  assert.deepStrictEqual(
    normalizeColor('#FF0080'),
    [255, 0, 128]
  );

  assert.deepStrictEqual(
    normalizeColor({
      red: 1,
      green: 2,
      blue: 3
    }),
    [1, 2, 3]
  );

  const command =
    normalizeLedPatch({
      enabled: true,
      brightness: 200,
      effect: 2,
      speed: 50,
      color: '#102030'
    });

  assert.deepStrictEqual(
    {
      ...command
    },
    {
      enabled: true,
      brightness: 200,
      effect: 2,
      speed: 50,
      color: [16, 32, 48]
    }
  );

  assert.throws(
    () => normalizeLedPatch({
      brightness: 256
    }),
    (error) =>
      error instanceof
        LedValidationError &&
      error.code ===
        'INVALID_LED_BRIGHTNESS'
  );

  const allStatus =
    await service.getAllStatus();

  assert.strictEqual(
    allStatus.leds.length,
    2
  );

  const strip =
    await service.getStripStatus(1);

  assert.strictEqual(
    strip.led.id,
    1
  );

  const update =
    await service.updateStrip(
      2,
      {
        enabled: true,
        brightness: 90,
        color: [10, 20, 30]
      }
    );

  assert.strictEqual(
    update.id,
    2
  );

  const updateRequest =
    requests.find(
      (request) =>
        request.endpoint ===
        'api/led/2'
    );

  assert.deepStrictEqual(
    updateRequest.options.query,
    {
      enabled: '1',
      brightness: 90,
      color: '10,20,30'
    }
  );

  await service.setAllEnabled(true);
  await service.setAllEnabled(false);
  await service.reset();

  assert.strictEqual(
    requests.some(
      (request) =>
        request.endpoint ===
        'api/all-on'
    ),
    true
  );

  assert.strictEqual(
    requests.some(
      (request) =>
        request.endpoint ===
        'api/all-off'
    ),
    true
  );

  assert.strictEqual(
    requests.some(
      (request) =>
        request.endpoint ===
        'api/led/reset'
    ),
    true
  );

  console.log(
    'OK: LED parancsvalidáció'
  );
  console.log(
    'OK: RGB tömb, objektum és hex szín'
  );
  console.log(
    'OK: LED státuszszolgáltatás'
  );
  console.log(
    'OK: LED módosítás és összes LED műveletek'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
