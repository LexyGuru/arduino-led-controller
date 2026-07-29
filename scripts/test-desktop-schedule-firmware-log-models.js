'use strict';

const assert = require('assert');

async function main() {
  const schedule = await import(
    '../desktop-tauri/src/services/v5ScheduleModels.mjs'
  );
  const firmware = await import(
    '../desktop-tauri/src/services/v5FirmwareModels.mjs'
  );
  const logs = await import(
    '../desktop-tauri/src/services/v5LogModels.mjs'
  );

  const schedules = schedule.normalizeScheduleList({
    success: true,
    data: [
      {
        id: 'b',
        day: 2,
        time: '20:00',
        leds: [
          {
            id: 1,
            enabled: true,
            brightness: 100,
            effect: 0,
            speed: 50,
            color: [1, 2, 3]
          }
        ]
      },
      {
        id: 'a',
        day: 1,
        time: '19:00',
        leds: []
      }
    ]
  });

  assert.strictEqual(
    schedules[0].id,
    'a'
  );

  assert.strictEqual(
    schedule.scheduleFingerprint(
      schedules
    ),
    schedule.scheduleFingerprint(
      [...schedules].reverse()
    )
  );

  const status = firmware.normalizeFirmwareStatus({
    data: {
      state: 'uploading',
      backups: [
        {
          id: 'fw_test',
          lastKnownGood: true
        }
      ]
    },
    source: 'network'
  });

  assert.strictEqual(
    status.progress,
    62
  );

  assert.strictEqual(
    status.backups[0]
      .lastKnownGood,
    true
  );

  const consoleLogs = logs.normalizeConsoleLogs({
    success: true,
    data: {
      logs: [
        {
          id: 2,
          message: 'two'
        },
        {
          id: 1,
          message: 'one'
        }
      ]
    }
  });

  assert.strictEqual(
    consoleLogs[0].id,
    2
  );

  const events = logs.mergeEvents(
    [
      {
        id: 'a',
        timestamp:
          '2026-07-29T08:00:00Z'
      }
    ],
    [
      {
        id: 'b',
        timestamp:
          '2026-07-29T09:00:00Z'
      }
    ]
  );

  assert.strictEqual(
    events[0].id,
    'b'
  );

  console.log(
    'OK: schedule normalizálás és stabil konfliktus-ujjlenyomat'
  );
  console.log(
    'OK: firmware állapot, progress és backup normalizálás'
  );
  console.log(
    'OK: konzol, audit és esemény normalizálás'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
