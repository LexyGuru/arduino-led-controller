'use strict';

const assert =
  require('assert');

const {
  LegacyEventBridge
} = require(
  '../server/legacy/legacy-event-bridge'
);

function main() {
  let subscriber =
    null;

  const eventBus = {
    subscribeAll(callback) {
      subscriber =
        callback;
      return () => {
        subscriber =
          null;
      };
    }
  };

  const emitted = [];

  const io = {
    emit(name, payload) {
      emitted.push({
        name,
        payload
      });
    }
  };

  const bridge =
    new LegacyEventBridge({
      eventBus
    });

  bridge.install(io);

  subscriber({
    id: 'event-1',
    topic:
      'led.updated',
    timestamp:
      '2026-07-29T05:00:00.000Z',
    payload: {
      id: 2,
      brightness: 120
    }
  });

  assert.strictEqual(
    emitted[0].name,
    'ledUpdate'
  );

  assert.strictEqual(
    emitted[0]
      .payload.id,
    2
  );

  bridge.close();

  assert.strictEqual(
    subscriber,
    null
  );

  console.log(
    'OK: V5 eseményből legacy Socket.IO esemény'
  );
  console.log(
    'OK: legacy eseményhíd leállítása'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
}
