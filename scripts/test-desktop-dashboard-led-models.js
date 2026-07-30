'use strict';

const assert =
  require('assert');

async function main() {
  const {
    normalizeArduinoStatus,
    dashboardDataSource
  } =
    await import(
      '../desktop-tauri/src/services/v5ArduinoModels.mjs'
    );

  const {
    ledCommand,
    normalizeLedList,
    presetCommands,
    shouldUseDirectFallback
  } =
    await import(
      '../desktop-tauri/src/services/v5LedModels.mjs'
    );

  const status =
    normalizeArduinoStatus({
      source:
        'network',
      data: {
        success: true,
        data: {
          connected: true,
          latencyMs: 17,
          status: {
            firmwareVersion:
              '3.0.22',
            rssi: -61,
            uptime: 120,
            scheduleCount: 7
          }
        }
      }
    });

  assert.strictEqual(
    status.connected,
    true
  );

  assert.strictEqual(
    status.firmwareVersion,
    '3.0.22'
  );

  assert.strictEqual(
    status.latencyMs,
    17
  );

  const leds =
    normalizeLedList({
      data: {
        success: true,
        data: {
          leds: [
            {
              id: 1,
              active: true,
              brightness: 200,
              red: 10,
              green: 20,
              blue: 30,
              effect: 2,
              speed: 40
            }
          ]
        }
      },
      source:
        'network'
    });

  assert.deepStrictEqual(
    leds[0].color,
    [10, 20, 30]
  );

  assert.strictEqual(
    leds[0].enabled,
    true
  );

  assert.deepStrictEqual(
    ledCommand(leds[0]),
    {
      enabled: true,
      brightness: 200,
      effect: 2,
      speed: 40,
      color: [10, 20, 30]
    }
  );

  assert.strictEqual(
    presetCommands(
      leds,
      'night'
    )[0].brightness,
    45
  );

  assert.strictEqual(
    shouldUseDirectFallback({
      authenticated: true,
      online: true
    }),
    false
  );

  assert.strictEqual(
    dashboardDataSource({
      authenticated: true,
      online: true,
      responseSource:
        'cache'
    }),
    'api-v2-cache'
  );

  console.log(
    'OK: Arduino API v2 státusz normalizálás'
  );
  console.log(
    'OK: LED lista, parancs és tesztpreset normalizálás'
  );
  console.log(
    'OK: biztonságos közvetlen fallback döntés'
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
