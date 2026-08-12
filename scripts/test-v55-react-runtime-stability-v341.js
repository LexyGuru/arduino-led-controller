#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(p, 'utf8');

const logsHook = read('desktop-tauri/src/hooks/useV5Logs.ts');
const dashboard = read('desktop-tauri/src/pages/DashboardPage.tsx');
const logsPage = read('desktop-tauri/src/pages/LogsPage.tsx');
const provider = read('desktop-tauri/src/api/react/DesktopApiContext.tsx');

assert.match(logsHook, /\buseRef\b/);
assert.match(logsHook, /const\s+legacyArduinoRef\s*=\s*useRef\s*\(\s*legacyArduino\s*\)/s);
assert.match(logsHook, /const\s+legacyErrorRef\s*=\s*useRef\s*\(\s*legacyError\s*\)/s);
assert.match(logsHook, /legacyArduinoRef\.current\s*=\s*legacyArduino\s*;/s);
assert.match(logsHook, /legacyErrorRef\.current\s*=\s*legacyError\s*;/s);

assert.match(logsHook, /const\s+fallbackArduino\s*=\s*legacyArduinoRef\.current\s*;/s);
assert.match(logsHook, /const\s+fallbackError\s*=\s*legacyErrorRef\.current\s*;/s);
assert.match(logsHook, /setConsoleLogs\s*\(\s*fallbackArduino\s*\)\s*;/s);
assert.match(logsHook, /setConsoleLogs\s*\(\s*legacyArduinoRef\.current\s*\)\s*;/s);

const refreshStart = logsHook.indexOf('const refresh =');
const refreshEnd = logsHook.indexOf('useEffect(', refreshStart);
assert.ok(refreshStart >= 0 && refreshEnd > refreshStart);
const refreshBlock = logsHook.slice(refreshStart, refreshEnd);

assert.doesNotMatch(refreshBlock, /\blegacyArduino\b[\s\S]*\]\s*\)/);
assert.doesNotMatch(refreshBlock, /\blegacyError\b[\s\S]*\]\s*\)/);
assert.match(refreshBlock, /\[\s*api\s*,\s*directFallback\s*\]/s);

assert.doesNotMatch(dashboard, /\buseV5Logs\b/);
assert.doesNotMatch(dashboard, /legacyArduino\s*:\s*\[\s*\]/);
assert.doesNotMatch(dashboard, /legacyNetwork\s*:\s*\[\s*\]/);
assert.match(dashboard, /const\s+EMPTY_NETWORK_LOGS\b/);
assert.match(
  dashboard,
  /buildDashboardStatistics\s*\([\s\S]*EMPTY_NETWORK_LOGS[\s\S]*\)/s
);

assert.equal(
  (logsPage.match(/\buseV5Logs\s*\(/g) || []).length,
  1,
  'LogsPage must own exactly one useV5Logs runtime instance'
);

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
}
walk('desktop-tauri/src');

let useV5LogsOccurrences = 0;
for (const file of files) {
  useV5LogsOccurrences += (read(file).match(/\buseV5Logs\s*\(/g) || []).length;
}

assert.equal(
  useV5LogsOccurrences,
  2,
  'Only the hook declaration and the LogsPage consumer may remain'
);

assert.match(provider, /\buseMemo\b/);
assert.match(provider, /createDesktopApi\s*\(/);
assert.match(
  provider,
  /const\s+api\s*=\s*useMemo\s*\([\s\S]*?\[\s*\]\s*\)/s,
  'DesktopApiProvider API identity must remain memoized'
);

console.log('USE_V5_LOGS_LEGACY_REF_STABILITY=PASSED');
console.log('USE_V5_LOGS_REFRESH_DEPENDENCY_STABILITY=PASSED');
console.log('DASHBOARD_DUPLICATE_LOGS_RUNTIME=REMOVED');
console.log('DASHBOARD_INLINE_EMPTY_ARRAY_TRIGGER=REMOVED');
console.log('LOGS_PAGE_SINGLE_RUNTIME_CONSUMER=PASSED');
console.log('DESKTOP_API_IDENTITY=STABLE');
console.log('V55_REACT_RUNTIME_STABILITY_V341_CONTRACT=PASSED');
