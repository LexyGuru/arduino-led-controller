#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const legacyCssFiles = [
  'desktop-tauri/src/styles.css',
  'desktop-tauri/src/api-v2.css',
  'desktop-tauri/src/dashboard-led-api-v2.css',
  'desktop-tauri/src/lxc-orchestration.css',
  'desktop-tauri/src/native-credential-bridge.css',
  'desktop-tauri/src/release-finalization.css',
  'desktop-tauri/src/schedule-firmware-logs-api-v2.css',
];

const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
const failures = [];

for (const file of legacyCssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const hits = source.match(hexPattern) || [];
  if (hits.length > 0) {
    failures.push(`${file}: hardcoded hex colors: ${[...new Set(hits)].join(', ')}`);
  }
}

assert.deepEqual(
  failures,
  [],
  `Legacy desktop CSS must use design-system tokens instead of hardcoded theme colors:\n${failures.join('\n')}`,
);

const themeCss = fs.readFileSync('desktop-tauri/src/beta7-theme.css', 'utf8');
for (const token of [
  '--ds-background',
  '--ds-surface',
  '--ds-surface-raised',
  '--ds-surface-soft',
  '--ds-surface-hover',
  '--ds-border',
  '--ds-border-strong',
  '--ds-text',
  '--ds-text-secondary',
  '--ds-text-muted',
  '--ds-accent',
  '--ds-success',
  '--ds-info',
  '--ds-warning',
  '--ds-error',
]) {
  assert.match(themeCss, new RegExp(token.replaceAll('-', '\\-')));
}

const logsCss = fs.readFileSync(
  'desktop-tauri/src/schedule-firmware-logs-api-v2.css',
  'utf8',
);
assert.match(
  logsCss,
  /\.v5-log-toolbar label[\s\S]*background:\s*var\(--ds-surface-soft\)/,
);
assert.match(
  logsCss,
  /\.v5-observability-list > div[\s\S]*background:\s*var\(--ds-surface-soft\)/,
);
assert.match(
  logsCss,
  /\.v5-observability-list > div[\s\S]*border:\s*1px solid var\(--ds-border\)/,
);
assert.match(
  logsCss,
  /\.v5-observability-list time[\s\S]*var\(--ds-text-muted\)/,
);
assert.match(
  logsCss,
  /\.v5-observability-list b[\s\S]*var\(--ds-info\)/,
);
assert.match(
  logsCss,
  /\.v5-observability-list span[\s\S]*var\(--ds-text-secondary\)/,
);

assert.doesNotMatch(
  themeCss,
  /html\[data-appearance='light'\] \.v5-backup-list>article\{background:#fff/,
  'Legacy light-only backup overrides must not bypass design tokens',
);

console.log(
  'OK: Beta.7 desktop legacy CSS theme-token migration contract (no hardcoded hex palette outside token definitions)',
);
