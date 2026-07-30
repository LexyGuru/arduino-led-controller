'use strict';

const assert =
  require('assert');

const {
  prometheusName,
  renderPrometheus
} = require(
  '../server/observability/prometheus-exporter'
);

function main() {
  assert.strictEqual(
    prometheusName(
      'HTTP.Requests.Total'
    ),
    'http_requests_total'
  );

  const output =
    renderPrometheus({
      generatedAt:
        '2026-07-29T05:00:00.000Z',
      counters: {
        'http.requests.total':
          12
      },
      timings: {
        'http.duration.all': {
          count: 2,
          totalMs: 30,
          minimumMs: 10,
          maximumMs: 20,
          averageMs: 15
        }
      }
    });

  assert.match(
    output,
    /arduino_led_controller_http_requests_total 12/
  );

  assert.match(
    output,
    /arduino_led_controller_http_duration_all_count 2/
  );

  assert.match(
    output,
    /arduino_led_controller_http_duration_all_sum_milliseconds 30/
  );

  console.log(
    'OK: Prometheus metrikanevek'
  );
  console.log(
    'OK: counter és timing szöveges export'
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
