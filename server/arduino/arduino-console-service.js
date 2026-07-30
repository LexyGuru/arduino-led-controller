'use strict';

const {
  EVENT_TOPICS
} = require('../events/topics');

function consoleValueToText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (['number', 'boolean', 'bigint'].includes(typeof value)) return String(value);
  if (value instanceof Error) return value.message;
  if (typeof value === 'object') {
    if (typeof value.message === 'string') return value.message;
    if (typeof value.text === 'string') return value.text;
    if (typeof value.msg === 'string') return value.msg;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return '[Nem megjeleníthető objektum]';
    }
  }
  return String(value);
}

function normalizeArduinoConsoleLog(raw, fallbackId = 0) {
  const source = raw && typeof raw === 'object'
    ? raw
    : { message: raw };
  const parsedId = Number(source.id);
  const id = Number.isFinite(parsedId) && parsedId >= 0
    ? parsedId
    : fallbackId;
  let type = consoleValueToText(
    source.type || source.level || source.severity || 'info'
  ).toLowerCase();
  if (!['console', 'info', 'success', 'warn', 'warning', 'error', 'output'].includes(type)) {
    type = 'info';
  }
  if (type === 'warning') type = 'warn';
  let messageValue = source.message ?? source.text ?? source.msg ?? source.event;
  if (messageValue == null && raw && typeof raw === 'object') {
    const details = { ...raw };
    for (const key of ['id', 'timestamp', 'time', 'uptime', 'type', 'level', 'severity']) {
      delete details[key];
    }
    messageValue = Object.keys(details).length ? details : '';
  }

  return {
    id,
    timestamp: consoleValueToText(
      source.timestamp ?? source.time ?? source.uptime ?? ''
    ),
    type,
    message: consoleValueToText(messageValue)
  };
}

class ArduinoConsoleService {
  constructor({
    arduinoClient,
    eventBus = null,
    metrics = null,
    logger = null,
    cacheLimit = 200,
    maximumPages = 24,
    cacheTtlMs = 2500
  } = {}) {
    if (!arduinoClient || typeof arduinoClient.get !== 'function') {
      throw new TypeError('Az ArduinoConsoleService számára ArduinoClient szükséges.');
    }
    this.arduinoClient = arduinoClient;
    this.eventBus = eventBus;
    this.metrics = metrics;
    this.logger = logger;
    this.cacheLimit = Math.max(10, Math.min(2000, Number(cacheLimit) || 200));
    this.maximumPages = Math.max(1, Math.min(100, Number(maximumPages) || 24));
    this.cacheTtlMs = Math.max(250, Math.min(60000, Number(cacheTtlMs) || 2500));
    this.cache = {
      logs: [],
      lastId: 0,
      updatedAt: 0,
      loading: null,
      resetCount: 0
    };
  }

  reset() {
    this.cache.logs = [];
    this.cache.lastId = 0;
    this.cache.updatedAt = 0;
    this.cache.resetCount += 1;
  }

  snapshot() {
    return {
      logs: this.cache.logs.map((entry) => ({ ...entry })),
      lastId: this.cache.lastId,
      cachedAt: this.cache.updatedAt,
      cacheLimit: this.cacheLimit,
      maximumPages: this.maximumPages,
      resetCount: this.cache.resetCount
    };
  }

  refresh({ force = false } = {}) {
    if (this.cache.loading) return this.cache.loading;
    if (
      !force &&
      this.cache.updatedAt &&
      Date.now() - this.cache.updatedAt < this.cacheTtlMs
    ) {
      this.metrics?.increment?.('arduino.console.cache_hit');
      return Promise.resolve(this.snapshot());
    }

    this.metrics?.increment?.('arduino.console.cache_miss');
    this.cache.loading = this.refreshDirect().finally(() => {
      this.cache.loading = null;
    });
    return this.cache.loading;
  }

  async refreshDirect() {
    let after = this.cache.lastId;
    let resetDetected = false;
    let pages = 0;

    for (let page = 0; page < this.maximumPages; page += 1) {
      const result = await this.arduinoClient.get(
        'api/console/logs',
        {
          query: { after: Math.max(0, after) },
          source: 'arduino-led-console-cache'
        }
      );
      pages += 1;
      const payload = result.data;
      const pageLogs = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.logs) ? payload.logs : []);
      const responseLastId = Number(
        Array.isArray(payload) ? 0 : payload?.lastId
      ) || 0;

      if (after > 0 && responseLastId > 0 && responseLastId < after && !resetDetected) {
        this.reset();
        after = 0;
        resetDetected = true;
        page -= 1;
        continue;
      }

      if (!pageLogs.length) break;

      const normalized = pageLogs.map(
        (entry, index) => normalizeArduinoConsoleLog(entry, after + index + 1)
      );
      const merged = new Map(
        this.cache.logs.map((entry) => [entry.id, entry])
      );
      for (const entry of normalized) merged.set(entry.id, entry);
      this.cache.logs = [...merged.values()]
        .sort((left, right) => left.id - right.id)
        .slice(-this.cacheLimit);

      const maximumId = normalized.reduce(
        (maximum, entry) => Math.max(maximum, Number(entry.id) || 0),
        0
      );
      const nextAfter = Math.max(responseLastId, maximumId, after);
      if (nextAfter <= after) break;
      after = nextAfter;
      this.cache.lastId = after;

      if (pageLogs.length < 1) break;
    }

    this.cache.updatedAt = Date.now();
    this.metrics?.increment?.('arduino.console.pages', pages);
    this.metrics?.increment?.('arduino.console.refresh');
    return this.snapshot();
  }

  async getStats() {
    let arduino = null;
    try {
      const result = await this.arduinoClient.get(
        'api/console/stats',
        { source: 'arduino-led-console-stats' }
      );
      arduino = result.data;
    } catch (error) {
      this.logger?.warn?.('Arduino konzolstatisztika nem érhető el.', {
        code: error.code
      });
    }

    return {
      arduino,
      cache: {
        entries: this.cache.logs.length,
        lastId: this.cache.lastId,
        cachedAt: this.cache.updatedAt,
        cacheLimit: this.cacheLimit,
        maximumPages: this.maximumPages,
        resetCount: this.cache.resetCount
      }
    };
  }

  async clear() {
    const result = await this.arduinoClient.get(
      'api/console/clear',
      { source: 'arduino-led-console-clear' }
    );
    this.reset();
    this.eventBus?.publish?.(
      EVENT_TOPICS.ARDUINO_CONSOLE_CLEARED,
      { latencyMs: result.latencyMs }
    );
    return {
      arduino: result.data,
      latencyMs: result.latencyMs,
      cache: this.snapshot()
    };
  }
}

module.exports = {
  ArduinoConsoleService,
  consoleValueToText,
  normalizeArduinoConsoleLog
};
