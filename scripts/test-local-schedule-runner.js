'use strict';

const assert = require('assert');

const {
  LocalScheduleRunner,
  localDateParts
} = require(
  '../server/schedule/local-schedule-runner'
);

async function main() {
  const date =
    new Date(
      '2026-07-28T17:30:00.000Z'
    );

  const parts =
    localDateParts(
      date,
      'Europe/Vienna'
    );

  const updates = [];

  const runner =
    new LocalScheduleRunner({
      repository: {
        async list() {
          return [
            {
              id: 'due',
              day:
                parts.weekday,
              time:
                parts.time,
              leds: [
                {
                  id: 2,
                  enabled: true,
                  brightness: 120,
                  effect: 1,
                  speed: 40,
                  color: [1, 2, 3]
                }
              ]
            },
            {
              id: 'not-due',
              day:
                parts.weekday,
              time: '00:00',
              leds: []
            }
          ];
        }
      },
      ledService: {
        async updateStrip(
          id,
          command
        ) {
          updates.push({
            id,
            command
          });

          return {
            success: true
          };
        }
      },
      timeZone:
        'Europe/Vienna',
      clock:
        () => date
    });

  const first =
    await runner.tick();

  assert.strictEqual(
    first.schedules,
    1
  );

  assert.strictEqual(
    updates.length,
    1
  );

  const second =
    await runner.tick();

  assert.strictEqual(
    second.skipped,
    true
  );

  const forced =
    await runner.tick({
      force: true
    });

  assert.strictEqual(
    forced.skipped,
    false
  );

  assert.strictEqual(
    updates.length,
    2
  );

  assert.strictEqual(
    runner.getStatus()
      .lastRun.failures,
    0
  );

  console.log(
    'OK: időzónahelyes helyi schedule futtató'
  );
  console.log(
    'OK: percenkénti duplikációvédelem'
  );
  console.log(
    'OK: manuális kényszerített schedule tick'
  );
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
