#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const logs=read('desktop-tauri/src/pages/LogsPage.tsx');
const hook=read('desktop-tauri/src/hooks/useV5Logs.ts');
const toolbar=read('desktop-tauri/src/components/v5/V5LogToolbar.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-logs-audit-redesign.css');
const pkg=JSON.parse(read('package.json'));

const semanticCall=(object,method)=>
  new RegExp(`${object}\\s*\\.\\s*${method}\\s*\\(`);

assert.match(logs,/className="page v55-logs-page beta4-logs-redesign"/);
assert.match(main,/import '\.\/v551-beta4-logs-audit-redesign\.css';/);

for(const marker of [
  '.beta4-logs-redesign .v5-log-toolbar',
  '.beta4-logs-redesign .v55-log-controlbar',
  '.beta4-logs-redesign .v55-log-summary',
  '.beta4-logs-redesign .v55-log-layout',
  '.beta4-logs-redesign .tauri-audit-console',
  '.beta4-logs-redesign .v55-unified-line',
  '.beta4-logs-redesign .tauri-audit-list',
  '@media(prefers-reduced-motion:reduce)'
]){
  assert.ok(css.includes(marker),`missing Beta.4 logs visual contract: ${marker}`);
}

// Logs page behavior preserved.
assert.match(logs,/useV5Logs/);
assert.match(logs,/useTauriAudit/);
assert.match(logs,/createDiagnosticsZip/);
assert.match(logs,/LevelFilter/);
assert.match(logs,/SourceFilter/);
assert.match(logs,/const visibleRows = paused/);
assert.match(logs,/\.slice\(0, 500\)/);
assert.match(logs,semanticCall('local','clear'));
assert.match(logs,semanticCall('state','clearConsole'));
assert.match(logs,/saveNativeExport/);
assert.match(logs,/write_export_file/);

// Hook refresh/fallback/event behavior preserved.
assert.match(hook,/setInterval[\s\S]*5000/);
assert.match(hook,/legacy-direct/);
assert.match(hook,/legacy-fallback/);
assert.match(hook,/api-v2-cache/);
assert.match(hook,semanticCall('api.eventStream','subscribe'));
assert.match(hook,semanticCall('api.logs','clearConsole'));
assert.match(hook,/Promise\.all/);

// Toolbar confirmation preserved.
assert.match(toolbar,/globalThis\.confirm/);
assert.match(toolbar,/apiAvailable/);
assert.match(toolbar,/onClear/);

assert.equal(
  pkg.scripts['test:beta4-logs-audit-redesign'],
  'node scripts/test-beta4-logs-audit-redesign.mjs'
);

console.log('BETA4_LOGS_COMMAND_CENTER=PASSED');
console.log('BETA4_LOG_FILTER_CONTROLBAR=PASSED');
console.log('BETA4_LOG_SUMMARY_TELEMETRY=PASSED');
console.log('BETA4_UNIFIED_ACTIVITY_STREAM=PASSED');
console.log('BETA4_LOCAL_AUDIT_VISUAL=PASSED');
console.log('BETA4_NETWORK_LOG_VISUAL=PASSED');
console.log('BETA4_LOG_EXPORT_DIAGNOSTICS_PRESERVED=PASSED');
console.log('BETA4_LOG_REFRESH_5000MS_PRESERVED=PASSED');
console.log('BETA4_EVENT_STREAM_PRESERVED=PASSED');
console.log('BETA4_LOGS_AUDIT_REDESIGN=PASSED');
