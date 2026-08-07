#!/usr/bin/env node
const fs = require('fs');

const dashboard = fs.readFileSync('desktop-tauri/src/pages/DashboardPage.tsx', 'utf8');
const css = fs.readFileSync('desktop-tauri/src/styles.css', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const syncPos = dashboard.indexOf('void onSyncTime()');
assert(syncPos >= 0, 'onSyncTime handler missing');

const actionPos = dashboard.lastIndexOf(
  'className="page-actions dashboard-time-actions"',
  syncPos
);
assert(actionPos >= 0, 'time sync actions do not use dashboard-time-actions');

assert(
  css.includes('.dashboard-time-actions{margin-top:18px}'),
  'desktop dashboard-time-actions margin-top must be 18px'
);

assert(
  css.includes('.dashboard-time-actions{margin-top:14px}'),
  'mobile dashboard-time-actions margin-top must be 14px'
);

console.log('DASHBOARD_TIME_ACTION_CLASS=PASSED');
console.log('DASHBOARD_TIME_ACTION_DESKTOP_SPACING=18PX');
console.log('DASHBOARD_TIME_ACTION_MOBILE_SPACING=14PX');
console.log('DASHBOARD_TIME_ACTION_SPACING_CONTRACT=PASSED');
