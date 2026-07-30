'use strict';

const assert = require('assert');
const EventEmitter = require('events');

const {
  OtaRunner
} = require('../server/firmware/ota-runner');

async function main() {
  let child = null;

  const runner = new OtaRunner({
    toolPath: '/tmp/arduinoOTA',
    address: '192.0.2.10',
    password: 'secret',
    timeoutMs: 5000,
    programRunner(command, args, options) {
      child = new EventEmitter();
      child.kill = (signal) => {
        child.killedWith = signal;
        return true;
      };
      options.onChild(child);
      return new Promise((resolve) => {
        child.resolve = resolve;
      });
    }
  });

  const upload = runner.upload('/tmp/firmware.bin');
  await new Promise((resolve) => setImmediate(resolve));

  assert.strictEqual(runner.isRunning(), true);

  const cancelled = runner.cancel();
  assert.strictEqual(cancelled.cancelled, true);
  assert.strictEqual(child.killedWith, 'SIGTERM');

  child.resolve({ code: 0, output: 'cancelled test' });
  await upload;

  assert.strictEqual(runner.isRunning(), false);
  assert.strictEqual(runner.cancel().cancelled, false);

  console.log('OK: OTA futó folyamat követése');
  console.log('OK: OTA SIGTERM megszakítás');
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
