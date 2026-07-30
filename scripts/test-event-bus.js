'use strict';

const assert = require('assert');

const {
  EventBus
} = require(
  '../server/events/event-bus'
);

async function main() {
  const bus =
    new EventBus({
      historyLimit: 3
    });

  const all = [];
  const led = [];

  const unsubscribeAll =
    bus.subscribeAll(
      (event) =>
        all.push(event)
    );

  const unsubscribeLed =
    bus.subscribe(
      'led.updated',
      (event) =>
        led.push(event)
    );

  bus.publish(
    'led.updated',
    {
      id: 1
    }
  );

  bus.publish(
    'firmware.state',
    {
      state: 'checking'
    }
  );

  bus.publish(
    'led.updated',
    {
      id: 2
    }
  );

  bus.publish(
    'schedule.synced',
    {
      count: 2
    }
  );

  assert.strictEqual(
    all.length,
    4
  );

  assert.strictEqual(
    led.length,
    2
  );

  assert.strictEqual(
    bus.recent().length,
    3
  );

  assert.deepStrictEqual(
    bus.recent({
      topic:
        'led.updated',
      limit: 10
    }).map(
      (event) =>
        event.payload.id
    ),
    [2]
  );

  assert.strictEqual(
    bus.stats()
      .publishedCount,
    4
  );

  unsubscribeAll();
  unsubscribeLed();

  console.log(
    'OK: közös eseménybusz'
  );
  console.log(
    'OK: korlátozott eseménytörténet'
  );
  console.log(
    'OK: téma szerinti esemény-előfizetés'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
