'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(
    path.join(ROOT, relative),
    'utf8'
  );
}

function has(text, marker) {
  assert.match(
    text,
    new RegExp(
      marker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )
    )
  );
}

function lacks(text, marker) {
  assert.doesNotMatch(
    text,
    new RegExp(
      marker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )
    )
  );
}

const app = read(
  'desktop-tauri/src/App.tsx'
);
const logs = read(
  'desktop-tauri/src/pages/LogsPage.tsx'
);
const theme = read(
  'desktop-tauri/src/design-system/ThemeProvider.tsx'
);
const themeCss = read(
  'desktop-tauri/src/beta7-theme.css'
);
const audit = read(
  'desktop-tauri/src/services/tauriAudit.ts'
);
const dashboardContract = read(
  'scripts/test-dashboard-arduino-time-sync.js'
);
const logUiContract = read(
  'scripts/test-desktop-schedule-firmware-log-ui-contract.js'
);
const auditContract = read(
  'scripts/test-beta7-theme-audit-console.js'
);

for (const marker of [
  'runAudited',
  'audit.timeSyncStart',
  'audit.ledEnabled',
  'audit.scheduleSave',
  'audit.firmwareCheck',
  'audit.otaStart',
  'audit.otaCancel'
]) {
  has(app, marker);
}

for (const marker of [
  'useTauriAudit',
  'logs.localAudit',
  'logs.recentActions',
  'logs.tauriAudit',
  'logs.tauriAuditTitle',
  'state.networkLogs'
]) {
  has(logs, marker);
}

for (const removed of [
  'logs.audit',
  'EVENT BUS',
  'state.auditEntries',
  'state.events'
]) {
  lacks(logs, removed);
}

for (const marker of [
  'root.dataset.appearance',
  'prefers-color-scheme: light'
]) {
  has(theme, marker);
}

for (const marker of [
  "data-appearance='light'",
  "data-appearance='dark'",
  '--ds-console-background',
  '.ota-console',
  '.v5-backup-list article',
  '.tauri-audit-console'
]) {
  has(themeCss, marker);
}

has(
  audit,
  'arduino-led-controller.tauri-audit.v1'
);
assert.match(
  audit,
  /LIMIT\s*=\s*500/
);
has(audit, 'runAudited');

for (const marker of [
  'runAudited(',
  "source:'time'",
  "action:'time.sync'",
  "t('audit.timeSyncStart')",
  "t('audit.timeSyncSuccess')",
  'controller.syncTimeWithComputer'
]) {
  has(dashboardContract, marker);
}

has(
  dashboardContract,
  'assert.doesNotMatch'
);

for (const marker of [
  "'logs.localAudit'",
  "'logs.recentActions'",
  "'logs.tauriAudit'",
  "'logs.tauriAuditTitle'",
  "'useTauriAudit'",
  "'state.networkLogs'"
]) {
  has(logUiContract, marker);
}

for (const marker of [
  "'logs.audit'",
  "'EVENT BUS'",
  "'state.auditEntries'",
  "'state.events'"
]) {
  has(logUiContract, marker);
}

has(
  logUiContract,
  'assert.doesNotMatch'
);

for (const marker of [
  'assert.doesNotMatch(',
  '/EVENT BUS/',
  '/state\\.events/',
  '/state\\.auditEntries/'
]) {
  has(auditContract, marker);
}

console.log(
  'OK: Beta.7 UI Freeze – Theme Engine, auditált műveletek, Tauri auditkonzol és kontrasztcontract'
);
console.log(
  'OK: a tiltott régi markerek csak negatív contractokban szerepelnek'
);
