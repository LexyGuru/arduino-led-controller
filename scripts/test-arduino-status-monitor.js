'use strict';

const assert = require('assert');

const {
  ArduinoStatusMonitor
} = require('../server/arduino/arduino-status-monitor');

async function main() {
  const events = [];
  let fail = false;
  const monitor = new ArduinoStatusMonitor({
    arduinoClient: {
      async getStatus() {
        if (fail) {
          const error = new Error('offline');
          error.code = 'ARDUINO_UNREACHABLE';
          throw error;
        }
        return {
          status: { firmwareVersion: '5.0.0' },
          latencyMs: 4
        };
      }
    },
    eventBus: {
      publish(topic, payload) { events.push({ topic, payload }); }
    },
    intervalMs: 5000,
    timeoutMs: 600
  });

  const online = await monitor.poll();
  assert.strictEqual(online.connected, true);
  assert.strictEqual(events[0].topic, 'arduino.status');

  fail = true;
  const offline = await monitor.poll();
  assert.strictEqual(offline.connected, false);
  assert.strictEqual(offline.consecutiveFailures, 1);
  assert.strictEqual(events[1].topic, 'arduino.offline');

  monitor.start({ immediate: false });
  assert.strictEqual(monitor.getStatus().active, true);
  monitor.stop();
  assert.strictEqual(monitor.getStatus().active, false);

  console.log('OK: közös Arduino státuszmonitor');
  console.log('OK: online és offline EventBus esemény');
  console.log('OK: monitor start/stop életciklus');
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
