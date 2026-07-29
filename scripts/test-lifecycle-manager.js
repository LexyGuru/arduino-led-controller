'use strict';

const assert =
  require('assert');

const {
  LifecycleManager
} = require(
  '../server/core/lifecycle-manager'
);

const {
  ShutdownCoordinator
} = require(
  '../server/core/shutdown-coordinator'
);

async function main() {
  let tick = 0;

  const lifecycle =
    new LifecycleManager({
      clock: () =>
        new Date(
          1700000000000 +
          tick++ * 1000
        )
    });

  assert.strictEqual(
    lifecycle.snapshot()
      .state,
    'starting'
  );

  lifecycle.markReady();

  assert.strictEqual(
    lifecycle.isReady(),
    true
  );

  const order = [];

  const coordinator =
    new ShutdownCoordinator({
      lifecycle,
      graceMs:
        5000,
      exit:
        () => {
          throw new Error(
            'A tesztben nem szabad kilépni.'
          );
        }
    });

  coordinator
    .register(
      'first',
      async () => {
        order.push(
          'first'
        );
      }
    )
    .register(
      'second',
      async () => {
        order.push(
          'second'
        );
      }
    );

  const result =
    await coordinator
      .shutdown(
        'test',
        {
          shouldExit:
            false
        }
      );

  assert.deepStrictEqual(
    order,
    [
      'second',
      'first'
    ]
  );

  assert.strictEqual(
    result.timedOut,
    false
  );

  assert.strictEqual(
    lifecycle.snapshot()
      .state,
    'stopped'
  );

  console.log(
    'OK: starting/ready/draining/stopped életciklus'
  );
  console.log(
    'OK: fordított sorrendű shutdown cleanup'
  );
  console.log(
    'OK: szabályos leállítás kilépés nélkül tesztelhető'
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
