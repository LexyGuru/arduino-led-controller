'use strict';

const assert = require('assert');

const {
  ScheduleService
} = require(
  '../server/schedule/schedule-service'
);

const {
  ScheduleValidationError
} = require(
  '../server/schedule/schedule-error'
);

const {
  SCHEDULE_RECORD_SIZE,
  encodeScheduleHex
} = require(
  '../server/schedule/schedule-codec'
);

const {
  normalizeScheduleFilename,
  normalizeScheduleTime
} = require(
  '../server/schedule/schedule-validation'
);

function sampleSchedule(
  overrides = {}
) {
  return {
    day: 1,
    time: '19:30',
    leds: [
      {
        id: 1,
        enabled: true,
        brightness: 180,
        effect: 2,
        speed: 50,
        color: '#FF2800'
      }
    ],
    ...overrides
  };
}

async function main() {
  const requests = [];

  const arduinoClient = {
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
        'api/schedule/status'
      ) {
        return {
          data: {
            count: 2
          },
          latencyMs: 2
        };
      }

      if (
        endpoint ===
        'api/schedule/files'
      ) {
        return {
          data: {
            files: [
              'S0L1.JS'
            ]
          },
          latencyMs: 3
        };
      }

      if (
        endpoint ===
        'api/schedules/chunk'
      ) {
        return {
          data: {
            success: true,
            count:
              options.query.total
          },
          latencyMs: 4
        };
      }

      return {
        data: {
          success: true,
          endpoint
        },
        latencyMs: 1
      };
    }
  };

  const service =
    new ScheduleService({
      arduinoClient
    });

  assert.strictEqual(
    normalizeScheduleFilename(
      's0l1.js'
    ),
    'S0L1.JS'
  );

  assert.strictEqual(
    normalizeScheduleTime(
      '07:05'
    ),
    '07:05'
  );

  assert.throws(
    () => normalizeScheduleTime(
      '25:00'
    ),
    (error) =>
      error instanceof
        ScheduleValidationError &&
      error.code ===
        'INVALID_SCHEDULE_TIME'
  );

  const encoded =
    encodeScheduleHex(
      sampleSchedule()
    );

  assert.strictEqual(
    encoded.length,
    SCHEDULE_RECORD_SIZE * 2
  );

  const overview =
    await service.getOverview();

  assert.strictEqual(
    overview.status.count,
    2
  );

  assert.deepStrictEqual(
    overview.files.files,
    ['S0L1.JS']
  );

  const day =
    await service.getDay(0);

  assert.strictEqual(
    day.day,
    0
  );

  const file =
    await service.getFile(
      's0l1.js'
    );

  assert.strictEqual(
    file.filename,
    'S0L1.JS'
  );

  const tested =
    await service.test(
      '12:45'
    );

  assert.strictEqual(
    tested.time,
    '12:45'
  );

  await service.reload();
  await service.generate();
  await service.clear();

  const syncResult =
    await service.sync([
      sampleSchedule(),
      sampleSchedule({
        day: 7,
        time: '22:10',
        leds: [
          {
            id: 3,
            enabled: false,
            brightness: 0,
            effect: 0,
            color: [0, 0, 0]
          }
        ]
      })
    ]);

  assert.strictEqual(
    syncResult.count,
    2
  );

  const syncRequests =
    requests.filter(
      (request) =>
        request.endpoint ===
        'api/schedules/chunk'
    );

  assert.strictEqual(
    syncRequests.length,
    2
  );

  assert.deepStrictEqual(
    syncRequests.map(
      (request) =>
        request.options.query.index
    ),
    [0, 1]
  );

  assert.strictEqual(
    syncRequests.every(
      (request) =>
        request.options.query.total === 2 &&
        request.options.query.payload.length ===
          SCHEDULE_RECORD_SIZE * 2
    ),
    true
  );

  console.log(
    'OK: schedule nap-, idő- és fájlnév-validáció'
  );
  console.log(
    'OK: 27 bájtos Arduino schedule kódolás'
  );
  console.log(
    'OK: schedule állapot-, fájl- és műveleti szolgáltatás'
  );
  console.log(
    'OK: Arduino EEPROM schedule szinkron'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
