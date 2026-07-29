'use strict';

function normalizeMetricName(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    throw new TypeError(
      'A metrika neve nem lehet üres.'
    );
  }

  return normalized.slice(0, 128);
}

function normalizePathLabel(value) {
  return String(value || '/')
    .split('?')[0]
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
      '/:id'
    )
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .slice(0, 160);
}

class MetricsRegistry {
  constructor({
    clock = () => Date.now()
  } = {}) {
    this.clock = clock;
    this.startedAt =
      new Date(this.clock())
        .toISOString();
    this.counters = new Map();
    this.timings = new Map();
  }

  increment(name, value = 1) {
    const key =
      normalizeMetricName(name);
    const amount =
      Number(value);

    if (!Number.isFinite(amount)) {
      throw new TypeError(
        'A metrika növekménye szám legyen.'
      );
    }

    this.counters.set(
      key,
      (this.counters.get(key) || 0) +
        amount
    );

    return this.counters.get(key);
  }

  observe(name, milliseconds) {
    const key =
      normalizeMetricName(name);
    const duration =
      Math.max(
        0,
        Number(milliseconds) || 0
      );

    const current =
      this.timings.get(key) || {
        count: 0,
        totalMs: 0,
        minimumMs: null,
        maximumMs: 0
      };

    current.count += 1;
    current.totalMs += duration;
    current.minimumMs =
      current.minimumMs === null
        ? duration
        : Math.min(
            current.minimumMs,
            duration
          );
    current.maximumMs =
      Math.max(
        current.maximumMs,
        duration
      );

    this.timings.set(
      key,
      current
    );

    return {
      ...current,
      averageMs:
        current.count > 0
          ? current.totalMs /
            current.count
          : 0
    };
  }

  recordHttpRequest({
    method,
    path,
    statusCode,
    durationMs
  }) {
    const methodLabel =
      String(method || 'GET')
        .toLowerCase();

    const pathLabel =
      normalizePathLabel(path)
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() ||
      'root';

    const statusClass =
      `${Math.floor(
        Number(statusCode) / 100
      )}xx`;

    this.increment(
      'http.requests.total'
    );
    this.increment(
      `http.requests.${methodLabel}`
    );
    this.increment(
      `http.responses.${statusClass}`
    );
    this.observe(
      'http.duration.all',
      durationMs
    );
    this.observe(
      `http.duration.${methodLabel}.${pathLabel}`,
      durationMs
    );
  }

  snapshot() {
    const counters =
      Object.fromEntries(
        [...this.counters.entries()]
          .sort(
            ([left], [right]) =>
              left.localeCompare(right)
          )
      );

    const timings = {};

    for (
      const [name, value]
      of [...this.timings.entries()]
        .sort(
          ([left], [right]) =>
            left.localeCompare(right)
        )
    ) {
      timings[name] = {
        ...value,
        averageMs:
          value.count > 0
            ? value.totalMs /
              value.count
            : 0
      };
    }

    return {
      startedAt:
        this.startedAt,
      generatedAt:
        new Date(this.clock())
          .toISOString(),
      counters,
      timings
    };
  }
}

function createRequestMetricsMiddleware({
  metricsProvider
} = {}) {
  if (
    typeof metricsProvider !==
    'function'
  ) {
    throw new TypeError(
      'A metricsProvider függvény kötelező.'
    );
  }

  return function requestMetrics(
    req,
    res,
    next
  ) {
    const started =
      process.hrtime.bigint();

    res.once(
      'finish',
      () => {
        const durationMs =
          Number(
            process.hrtime.bigint() -
            started
          ) / 1_000_000;

        metricsProvider()
          .recordHttpRequest({
            method:
              req.method,
            path:
              req.originalUrl ||
              req.url,
            statusCode:
              res.statusCode,
            durationMs
          });
      }
    );

    return next();
  };
}

module.exports = {
  MetricsRegistry,
  createRequestMetricsMiddleware,
  normalizeMetricName,
  normalizePathLabel
};
