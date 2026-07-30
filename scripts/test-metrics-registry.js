'use strict';

const assert =
  require('assert');

const {
  MetricsRegistry,
  normalizePathLabel
} = require(
  '../server/observability/metrics-registry'
);

function main() {
  let now =
    1700000000000;

  const metrics =
    new MetricsRegistry({
      clock:
        () => now
    });

  metrics.increment(
    'custom.jobs'
  );

  metrics.observe(
    'arduino.latency',
    12
  );

  metrics.observe(
    'arduino.latency',
    18
  );

  metrics.recordHttpRequest({
    method:
      'GET',
    path:
      '/api/v2/leds/123?x=1',
    statusCode:
      200,
    durationMs:
      5
  });

  now += 1000;

  const snapshot =
    metrics.snapshot();

  assert.strictEqual(
    snapshot.counters
      ['custom.jobs'],
    1
  );

  assert.strictEqual(
    snapshot.counters
      ['http.requests.total'],
    1
  );

  assert.strictEqual(
    snapshot.timings
      ['arduino.latency']
      .averageMs,
    15
  );

  assert.strictEqual(
    normalizePathLabel(
      '/api/v2/users/550e8400-e29b-41d4-a716-446655440000'
    ),
    '/api/v2/users/:id'
  );

  console.log(
    'OK: számláló- és időmérő metrikák'
  );
  console.log(
    'OK: HTTP státuszosztály és időmérés'
  );
  console.log(
    'OK: alacsony kardinalitású útvonalcímkék'
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
