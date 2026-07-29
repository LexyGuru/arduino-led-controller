'use strict';

const assert = require('assert');
const path = require('path');
const Module = require('module');

const cronPath = require.resolve('node-cron');
const originalCache = require.cache[cronPath];

let passedThrough = 0;
require.cache[cronPath] = {
  id: cronPath,
  filename: cronPath,
  loaded: true,
  exports: {
    schedule(expression) {
      passedThrough += 1;
      return { expression, real: true };
    },
    validate() { return true; }
  }
};

const modulePath = require.resolve('../server/legacy/legacy-cron-guard');
delete require.cache[modulePath];
const {
  installLegacyCronGuard,
  resetLegacyCronGuardForTests
} = require(modulePath);

try {
  resetLegacyCronGuardForTests();
  const state = installLegacyCronGuard({
    suppressLocalScheduleCron: true,
    suppressStatusCron: true
  });
  const cron = require('node-cron');
  const local = cron.schedule('* * * * *', () => {});
  const status = cron.schedule('*/30 * * * * *', () => {});
  const other = cron.schedule('0 0 * * *', () => {});

  assert.strictEqual(local.getStatus(), 'stopped');
  assert.strictEqual(status.getStatus(), 'stopped');
  assert.strictEqual(other.real, true);
  assert.strictEqual(passedThrough, 1);
  assert.strictEqual(state.snapshot().suppressed.length, 2);

  console.log('OK: legacy helyi schedule cron letiltás');
  console.log('OK: legacy 30 másodperces státuszcron letiltás');
  console.log('OK: más cron kifejezések változatlanok');
} finally {
  resetLegacyCronGuardForTests();
  if (originalCache) require.cache[cronPath] = originalCache;
  else delete require.cache[cronPath];
}
