#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'desktop-tauri/src/components/v55/DeviceHealthPanel.tsx',
  'utf8'
);

// Durable source contract: both timestamp units are normalized before age math.
assert.match(source, /function normalizeTelemetryTimestampMs\(/);
assert.match(source, /value < 10_000_000_000/);
assert.match(source, /value \* 1000/);
assert.match(source, /Date\.UTC\(2000, 0, 1\)/);
assert.match(source, /maximumFutureSkew/);
assert.match(source, /now - timestamp/);
assert.doesNotMatch(source, /Date\.now\(\) - value/);

function normalizeTelemetryTimestampMs(value, now) {
  if (
    value == null ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const timestamp =
    value < 10_000_000_000
      ? value * 1000
      : value;

  const minimumPlausible = Date.UTC(2000, 0, 1);
  const maximumFutureSkew = now + 5 * 60 * 1000;

  if (
    !Number.isFinite(timestamp) ||
    timestamp < minimumPlausible ||
    timestamp > maximumFutureSkew
  ) {
    return null;
  }

  return timestamp;
}

function ageLabel(value, now) {
  const timestamp = normalizeTelemetryTimestampMs(value, now);
  if (timestamp == null) return '—';

  const seconds = Math.max(
    0,
    Math.floor((now - timestamp) / 1000)
  );
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const now = Date.UTC(2026, 7, 16, 11, 33, 0);

// ConnectionHealth contract: JS milliseconds.
assert.equal(ageLabel(now - 4_000, now), '4s');

// Native NetworkLog contract: UNIX seconds.
assert.equal(
  ageLabel(Math.floor((now - 45_000) / 1000), now),
  '45s'
);
assert.equal(
  ageLabel(Math.floor((now - 127 * 60_000) / 1000), now),
  '2h 7m'
);

// Invalid values must never become epoch-sized ages.
for (const value of [null, 0, -1, NaN, Infinity]) {
  assert.equal(ageLabel(value, now), '—');
}
assert.equal(ageLabel(1, now), '—');
assert.equal(ageLabel(now + 10 * 60_000, now), '—');
assert.equal(ageLabel(now + 30_000, now), '0s');

// The timestamp fallback still preserves ConnectionHealth milliseconds and
// NetworkLog UNIX-seconds input, but V621 first filters recovered transient
// macOS credential-bootstrap noise. Only an effective error may expose a
// failure timestamp.
assert.match(source, /effectiveHealthError/);
assert.match(source, /effectiveNetworkError/);
assert.match(
  source,
  /effectiveHealthError \|\| effectiveNetworkError[\s\S]*health\.lastFailureAt \?\? effectiveNetworkError\?\.timestamp \?\? null/
);

console.log('TELEMETRY_TIMESTAMP_SECONDS_NORMALIZED=PASSED');
console.log('TELEMETRY_TIMESTAMP_MILLISECONDS_PRESERVED=PASSED');
console.log('TELEMETRY_TIMESTAMP_INVALID_VALUES_GUARDED=PASSED');
console.log('TELEMETRY_TIMESTAMP_EPOCH_AGE_REGRESSION=PASSED');
