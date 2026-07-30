'use strict';

const assert =
  require('assert');

const {
  withSuppressedSignalHandlers
} = require(
  '../server/legacy/legacy-signal-guard'
);

function main() {
  const before =
    process.listenerCount(
      'SIGTERM'
    );

  let messageInstalled =
    false;

  const outcome =
    withSuppressedSignalHandlers(
      () => {
        process.on(
          'SIGTERM',
          () => {}
        );

        const listener =
          () => {};

        process.once(
          'message',
          listener
        );

        messageInstalled =
          process.listeners(
            'message'
          ).includes(
            listener
          );

        process.off(
          'message',
          listener
        );

        return 'loaded';
      }
    );

  assert.strictEqual(
    outcome.result,
    'loaded'
  );

  assert.strictEqual(
    outcome.ignored.length,
    1
  );

  assert.strictEqual(
    process.listenerCount(
      'SIGTERM'
    ),
    before
  );

  assert.strictEqual(
    messageInstalled,
    true
  );

  console.log(
    'OK: legacy SIGTERM/SIGINT handler elnyomás'
  );
  console.log(
    'OK: nem-szignál process listenerek megmaradnak'
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
