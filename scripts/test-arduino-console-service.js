'use strict';

const assert = require('assert');

const {
  ArduinoConsoleService,
  normalizeArduinoConsoleLog
} = require('../server/arduino/arduino-console-service');

async function main() {
  const requests = [];
  let clearCalled = false;
  const client = {
    async get(endpoint, options = {}) {
      requests.push({ endpoint, options });
      if (endpoint === 'api/console/logs') {
        const after = Number(options.query?.after) || 0;
        if (after === 0) {
          return {
            data: {
              logs: [
                { id: 1, level: 'warning', message: 'első' },
                { id: 2, type: 'success', text: 'második' }
              ],
              lastId: 2
            }
          };
        }
        return { data: { logs: [], lastId: 2 } };
      }
      if (endpoint === 'api/console/stats') {
        return { data: { count: 2 } };
      }
      if (endpoint === 'api/console/clear') {
        clearCalled = true;
        return { data: { success: true }, latencyMs: 1 };
      }
      throw new Error('unexpected endpoint');
    }
  };

  const events = [];
  const service = new ArduinoConsoleService({
    arduinoClient: client,
    eventBus: { publish(topic) { events.push(topic); } },
    cacheLimit: 200,
    maximumPages: 4,
    cacheTtlMs: 5000
  });

  const normalized = normalizeArduinoConsoleLog({ level: 'warning', msg: 'teszt' }, 3);
  assert.strictEqual(normalized.type, 'warn');
  assert.strictEqual(normalized.message, 'teszt');

  const refreshed = await service.refresh({ force: true });
  assert.strictEqual(refreshed.logs.length, 2);
  assert.strictEqual(refreshed.lastId, 2);

  const before = requests.length;
  await service.refresh();
  assert.strictEqual(requests.length, before);

  const stats = await service.getStats();
  assert.strictEqual(stats.arduino.count, 2);

  await service.clear();
  assert.strictEqual(clearCalled, true);
  assert.strictEqual(service.snapshot().logs.length, 0);
  assert.deepStrictEqual(events, ['arduino.console-cleared']);

  console.log('OK: lapozott Arduino konzolcache');
  console.log('OK: konzolbejegyzés-normalizálás és TTL cache');
  console.log('OK: közös konzoltörlés és esemény');
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
