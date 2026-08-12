#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');
const dashboard = read('desktop-tauri/src/pages/DashboardPage.tsx');
const logs = read('desktop-tauri/src/pages/LogsPage.tsx');
const stats = read('desktop-tauri/src/components/v55/StatisticsPanel.tsx');
const timeline = read('desktop-tauri/src/components/v55/ActivityTimeline.tsx');
const util = read('desktop-tauri/src/utils/v55Statistics.ts');
const css = read('desktop-tauri/src/v55-dashboard-stats-logs.css');
const main = read('desktop-tauri/src/main.tsx');
const i18n = read('desktop-tauri/src/i18n/index.tsx');

assert.match(dashboard, /v55-dashboard-hero/);
assert.match(dashboard, /dashboard\.eyebrow/);
assert.match(dashboard, /dashboard2\.controlCenter/);
for (const marker of [
  'dashboard.today',
  'dashboard.tomorrow',
  'dashboard.arduinoTime',
  'dashboard.timezone',
  'dashboard.utcOffset',
  'dashboard.timeSync',
  'dashboard.syncComputer',
  'function formatArduinoTime('
]) {
  assert.match(dashboard, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(dashboard, /StatisticsPanel/);
assert.match(dashboard, /ActivityTimeline/);
assert.match(dashboard, /buildDashboardStatistics/);
assert.match(dashboard, /status\?\.http\?\.requests/);
assert.match(dashboard, /status\?\.freeMemory/);
assert.match(dashboard, /status\?\.strips/);
assert.match(dashboard, /scheduleSync/);

assert.match(util, /httpSuccessPercent/);
assert.match(util, /scheduleDays/);
assert.match(util, /sourceCounts/);
assert.match(util, /auditErrors/);
assert.doesNotMatch(util, /Math\.random/);

assert.match(stats, /v55-statistics-grid/);
assert.match(stats, /scheduleDistribution/);
assert.match(stats, /auditSources/);
assert.match(timeline, /v55-timeline/);

assert.match(logs, /V5LogToolbar/);
assert.match(logs, /v5-observability-list tauri-audit-list/);
assert.match(logs, /v55-unified-log/);
assert.match(logs, /downloadText/);
assert.match(logs, /paused/);
assert.match(logs, /LevelFilter/);
assert.match(logs, /SourceFilter/);
assert.match(logs, /logs\.tauriAudit/);
assert.match(logs, /logs\.tauriAuditTitle/);
assert.match(logs, /logs\.noTauriAudit/);
assert.match(logs, /tauri-audit-console-panel/);
assert.match(logs, /tauri-audit-console/);

assert.match(css, /v55-dashboard-hero/);
assert.match(css, /v55-statistics-grid/);
assert.match(css, /v55-unified-log/);
assert.match(css, /@media\(max-width:820px\)/);
assert.match(css, /@media\(max-width:520px\)/);
assert.match(main, /v55-dashboard-stats-logs\.css/);

for (const key of [
  'dashboard2.controlCenter',
  'dashboard2.title',
  'stats.title',
  'stats.scheduleDistribution',
  'activity.title',
  'logs2.title',
  'logs2.level',
  'logs2.source',
  'logs2.export'
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (i18n.match(new RegExp(`['"]${escaped}['"]`, 'g')) || []).length;
  assert.equal(count, 3, `${key}: HU/EN/DE parity`);
}

console.log('DASHBOARD_2_REAL_DATA_STATISTICS=PASSED');
console.log('STATISTICS_1_NO_FAKE_HISTORY=PASSED');
console.log('ACTIVITY_TIMELINE_REAL_AUDIT=PASSED');
console.log('LOGS_2_UNIFIED_FILTER_EXPORT=PASSED');
console.log('DASHBOARD_STATS_LOGS_V315_CONTRACT=PASSED');
