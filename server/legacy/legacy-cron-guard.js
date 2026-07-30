'use strict';

const GUARD_KEY = Symbol.for(
  'arduino-led-controller.legacy-cron-guard'
);

function normalizeExpression(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function createNoopTask(expression, reason) {
  let status = 'stopped';

  return {
    expression,
    reason,
    start() {
      status = 'stopped';
      return this;
    },
    stop() {
      status = 'stopped';
      return this;
    },
    destroy() {
      status = 'destroyed';
      return this;
    },
    execute() {
      return Promise.resolve({
        suppressed: true,
        expression,
        reason
      });
    },
    getStatus() {
      return status;
    },
    on() {
      return this;
    },
    off() {
      return this;
    }
  };
}

function copyProperties(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (key === 'schedule') continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor) continue;
    try {
      Object.defineProperty(target, key, descriptor);
    } catch (_) {
      // Egyes modul-export tulajdonságok nem írhatók újra.
    }
  }
  return target;
}

function installLegacyCronGuard({
  suppressLocalScheduleCron = true,
  suppressStatusCron = true,
  logger = null
} = {}) {
  if (globalThis[GUARD_KEY]) {
    return globalThis[GUARD_KEY];
  }

  const modulePath = require.resolve('node-cron');
  const original = require(modulePath);
  const originalSchedule = original.schedule.bind(original);

  const blocked = new Map();
  if (suppressLocalScheduleCron) {
    blocked.set('* * * * *', 'legacy-local-schedule-cron');
  }
  if (suppressStatusCron) {
    blocked.set('*/30 * * * * *', 'legacy-arduino-status-cron');
  }

  const state = {
    installed: true,
    blockedExpressions: [...blocked.keys()],
    suppressed: [],
    passedThrough: 0,
    snapshot() {
      return {
        installed: this.installed,
        blockedExpressions: [...this.blockedExpressions],
        suppressed: this.suppressed.map((entry) => ({ ...entry })),
        passedThrough: this.passedThrough
      };
    }
  };

  const patched = copyProperties({}, original);
  patched.schedule = function guardedSchedule(expression, task, options) {
    const normalized = normalizeExpression(expression);
    const reason = blocked.get(normalized);

    if (reason) {
      const entry = {
        expression: normalized,
        reason,
        suppressedAt: new Date().toISOString()
      };
      state.suppressed.push(entry);
      logger?.warn?.('Legacy cron letiltva a V5 cutover miatt.', entry);
      return createNoopTask(normalized, reason);
    }

    state.passedThrough += 1;
    return originalSchedule(expression, task, options);
  };

  const cacheEntry = require.cache[modulePath];
  if (!cacheEntry) {
    throw new Error('A node-cron gyorsítótár-bejegyzése nem található.');
  }
  cacheEntry.exports = patched;
  globalThis[GUARD_KEY] = state;
  return state;
}

function resetLegacyCronGuardForTests() {
  delete globalThis[GUARD_KEY];
}

module.exports = {
  GUARD_KEY,
  createNoopTask,
  installLegacyCronGuard,
  normalizeExpression,
  resetLegacyCronGuardForTests
};
