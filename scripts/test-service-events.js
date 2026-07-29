'use strict';

const assert = require('assert');

const {
  EventBus
} = require(
  '../server/events/event-bus'
);

const {
  LedService
} = require(
  '../server/led/led-service'
);

const {
  ScheduleService
} = require(
  '../server/schedule/schedule-service'
);

const {
  FirmwareService
} = require(
  '../server/firmware/firmware-service'
);

async function main() {
  const bus =
    new EventBus({
      historyLimit: 50
    });

  const arduinoClient = {
    request() {},
    async get(
      endpoint,
      options = {}
    ) {
      if (
        endpoint ===
        'api/schedules/chunk'
      ) {
        return {
          data: {
            count:
              options.query.total
          },
          latencyMs: 1
        };
      }

      return {
        data: {
          success: true
        },
        latencyMs: 1
      };
    }
  };

  const led =
    new LedService({
      arduinoClient,
      eventBus:
        bus
    });

  await led.updateStrip(
    1,
    {
      enabled: true,
      brightness: 120,
      effect: 0,
      speed: 50,
      color: '#010203'
    }
  );

  await led.setAllEnabled(
    false
  );

  await led.reset();

  const schedule =
    new ScheduleService({
      arduinoClient,
      eventBus:
        bus
    });

  await schedule.reload();

  await schedule.test(
    '12:30'
  );

  await schedule.sync([
    {
      day: 1,
      time: '12:30',
      leds: [
        {
          id: 1,
          enabled: true,
          brightness: 120,
          effect: 0,
          speed: 50,
          color: [
            1,
            2,
            3
          ]
        }
      ]
    }
  ]);

  const firmware =
    new FirmwareService({
      arduinoClient: {},
      releaseClient: {},
      otaRunner: {},
      firmwareDir: '/tmp',
      otaToolPath: '/tmp/tool',
      otaPassword: 'password',
      repository: 'owner/repo',
      releaseTag: 'firmware-latest',
      eventBus:
        bus
    });

  firmware.setState(
    'checking',
    'Teszt.'
  );

  const topics =
    bus.recent({
      limit: 50
    }).map(
      (event) =>
        event.topic
    );

  for (
    const expected
    of [
      'led.updated',
      'led.all-changed',
      'led.reset',
      'schedule.reloaded',
      'schedule.tested',
      'schedule.synced',
      'firmware.state'
    ]
  ) {
    assert.strictEqual(
      topics.includes(
        expected
      ),
      true,
      `Hiányzó esemény: ${expected}`
    );
  }

  console.log(
    'OK: LED szolgáltatásesemények'
  );
  console.log(
    'OK: schedule szolgáltatásesemények'
  );
  console.log(
    'OK: firmware állapotesemények'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
