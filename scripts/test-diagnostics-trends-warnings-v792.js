'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const panel=fs.readFileSync('desktop-tauri/src/components/v55/DiagnosticsPanel.tsx','utf8'),controller=fs.readFileSync('desktop-tauri/src/hooks/useController.ts','utf8');
for(const x of ['useEffect, useMemo, useState','DiagnosticsTrendSample','slice(-60)','latest.rssi<=-75','latest.httpMaxMs>=500','latest.schedulerMaxUs>=5000','latest.renderMaxUs>=20000','latest.statusMaxUs>=10000','>=512','data-history-samples={history.length}','v792-diagnostics-warning-list','HTTP max Δ','Scheduler Δ','Render Δ']) assert.ok(panel.includes(x),x);
const a=controller.indexOf('const refreshDiagnostics ='),b=controller.indexOf('const refreshFirmware =',a); assert.ok(a>=0&&b>a); const block=controller.slice(a,b); assert.ok(!block.includes("state: 'offline'")); assert.ok(!block.includes("state: 'recovering'"));
console.log('V792_PANEL_LOCAL_HISTORY=PASSED'); console.log('V792_HISTORY_CAP_60=PASSED'); console.log('V792_WARNING_THRESHOLDS=PASSED'); console.log('V792_PRIMARY_CONNECTION_STATE_ISOLATION=PASSED'); console.log('V792_DIAGNOSTICS_TRENDS_WARNINGS_MEGA9=PASSED');
