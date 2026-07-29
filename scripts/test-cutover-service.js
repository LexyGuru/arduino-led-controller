'use strict';

const assert = require('assert');
const {
  LegacyCutoverService
} = require('../server/legacy/legacy-cutover-service');

const service = new LegacyCutoverService({
  config: {
    legacy: {
      apiAdaptersEnabled: true,
      localScheduleAdaptersEnabled: true,
      socketEventBridgeEnabled: true,
      suppressLocalScheduleCron: true,
      suppressStatusCron: true
    }
  },
  cronGuard: {
    snapshot() {
      return { installed: true, suppressed: [{}, {}] };
    }
  },
  localScheduleRunner: {
    getStatus() { return { active: true }; }
  },
  arduinoStatusMonitor: {
    getStatus() { return { active: true, connected: true }; }
  },
  arduinoConsoleService: {
    snapshot() { return { logs: [] }; }
  },
  scheduleFileService: {
    status() { return { maximumBytes: 1024 }; }
  }
});

const snapshot = service.snapshot();
assert.strictEqual(snapshot.readyForLegacyCronRemoval, true);
assert.strictEqual(snapshot.legacyAdapters.localSchedules, true);
assert.strictEqual(snapshot.legacyCronSuppression.runtime.suppressed.length, 2);

console.log('OK: legacy cutover összesített állapot');
console.log('OK: V5 runner és státuszmonitor készenléte');
