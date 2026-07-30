'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const os =
  require('os');
const path =
  require('path');

const {
  LocalScheduleRepository
} = require(
  '../server/schedule/local-schedule-repository'
);

function schedule(
  overrides = {}
) {
  return {
    day:
      1,
    time:
      '18:30',
    leds: [
      {
        id:
          1,
        enabled:
          true,
        brightness:
          100,
        effect:
          0,
        speed:
          50,
        color: [
          255,
          0,
          0
        ]
      }
    ],
    ...overrides
  };
}

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'schedule-update-'
      )
    );

  const events = [];

  try {
    const repository =
      new LocalScheduleRepository({
        filePath:
          path.join(
            tempRoot,
            'weekly-led-schedules.json'
          ),
        eventBus: {
          publish(
            topic,
            payload
          ) {
            events.push({
              topic,
              payload
            });
          }
        }
      });

    const [
      created
    ] =
      await repository
        .create(
          schedule()
        );

    const updated =
      await repository
        .update(
          created.id,
          schedule({
            day:
              5,
            time:
              '22:15'
          })
        );

    assert.strictEqual(
      updated.id,
      created.id
    );

    assert.strictEqual(
      updated.day,
      5
    );

    assert.strictEqual(
      updated.time,
      '22:15'
    );

    assert.strictEqual(
      events.some(
        (event) =>
          event.topic ===
          'local-schedule.updated'
      ),
      true
    );

    console.log(
      'OK: helyi schedule módosítás azonosító megtartásával'
    );
    console.log(
      'OK: módosítási esemény publikálása'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
