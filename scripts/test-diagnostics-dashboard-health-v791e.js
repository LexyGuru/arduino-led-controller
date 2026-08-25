'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const controller = fs.readFileSync(
  'desktop-tauri/src/hooks/useController.ts',
  'utf8'
);
const app = fs.readFileSync(
  'desktop-tauri/src/App.tsx',
  'utf8'
);
const dashboard = fs.readFileSync(
  'desktop-tauri/src/pages/DashboardPage.tsx',
  'utf8'
);
const health = fs.readFileSync(
  'desktop-tauri/src/components/v55/DeviceHealthPanel.tsx',
  'utf8'
);
const panel = fs.readFileSync(
  'desktop-tauri/src/components/v55/DiagnosticsPanel.tsx',
  'utf8'
);
const types = fs.readFileSync(
  'desktop-tauri/src/types/index.ts',
  'utf8'
);
const api = fs.readFileSync(
  'desktop-tauri/src/services/tauriApi.ts',
  'utf8'
);

assert.ok(controller.includes('useState<ArduinoDiagnosticsResult | null>'));
assert.ok(controller.includes("activePageRef.current !== 'dashboard'"));
assert.ok(
  /document\.visibilityState\s*===\s*[\'"]visible[\'"]/.test(controller),
  'dashboard diagnostics visibility guard missing'
);
assert.ok(controller.includes('15_000'));
assert.ok(controller.includes('await tauriApi.diagnostics()'));
assert.ok(controller.includes('diagnosticsSupported:'));
assert.ok(controller.includes('diagnosticsLastSuccessAt:'));
assert.ok(controller.includes('diagnosticsLastFailureAt:'));
assert.ok(controller.includes('diagnosticsLastError:'));
const returnMatches = [...controller.matchAll(/^\s*return \{$/gm)];
assert.ok(returnMatches.length > 0, 'controller hook return object missing');
const finalReturnStart = returnMatches[returnMatches.length - 1].index;
const finalReturnTail = controller.slice(finalReturnStart);
assert.ok(finalReturnTail.includes('diagnostics,'));
assert.ok(finalReturnTail.includes('diagnosticsError,'));
assert.ok(finalReturnTail.includes('refreshDiagnostics,'));

const diagnosticsStart = controller.indexOf('const refreshDiagnostics =');
const diagnosticsEnd = controller.indexOf('const refreshFirmware =', diagnosticsStart);
assert.ok(diagnosticsStart >= 0 && diagnosticsEnd > diagnosticsStart);
const diagnosticsBlock = controller.slice(diagnosticsStart, diagnosticsEnd);
assert.ok(!diagnosticsBlock.includes("state: 'offline'"));
assert.ok(!diagnosticsBlock.includes("state: 'recovering'"));

assert.ok(app.includes('diagnostics={controller.diagnostics}'));
assert.ok(app.includes('diagnosticsError={controller.diagnosticsError}'));
assert.ok(app.includes('controller.refreshDiagnostics(true)'));

assert.ok(dashboard.includes("import { DiagnosticsPanel }"));
assert.ok(dashboard.includes('<DiagnosticsPanel'));

const dashboardHeader = dashboard.split('}: {', 1)[0];
assert.ok(dashboardHeader.includes('diagnostics,'));
assert.ok(dashboardHeader.includes('diagnosticsError,'));
assert.ok(dashboardHeader.includes('onRefreshDiagnostics,'));

assert.ok(dashboard.includes('diagnostics: ArduinoDiagnosticsResult | null;'));
assert.ok(dashboard.includes('diagnosticsError: string | null;'));
assert.ok(dashboard.includes('onRefreshDiagnostics: () => void;'));
assert.ok(dashboard.includes('onRefresh={onRefreshDiagnostics}'));

assert.ok(app.includes('diagnostics={controller.diagnostics}'));
assert.ok(app.includes('diagnosticsError={controller.diagnosticsError}'));
assert.ok(app.includes('controller.refreshDiagnostics(true)'));

assert.ok(health.includes('health.diagnosticsSupported'));
assert.ok(health.includes('health.diagnosticsLastSuccessAt'));
assert.ok(types.includes('diagnosticsSupported?: boolean | null;'));

assert.ok(panel.includes('Direct API 1.1'));
assert.ok(panel.includes('HTTP max'));
assert.ok(panel.includes('Scheduler max'));
assert.ok(panel.includes('Render max'));
assert.ok(panel.includes('EEPROM Δ'));
assert.ok(panel.includes('Firmware diagnostics unavailable'));

assert.ok(api.includes("sharedRead('diagnostics',5000"));
assert.ok(api.includes('readArduinoDiagnosticsNegotiated'));

console.log('V791E_DIAGNOSTICS_CONTROLLER_STATE=PASSED');
console.log('V791E_DASHBOARD_ONLY_POLLING=PASSED');
console.log('V791E_VISIBLE_ONLY_POLLING=PASSED');
console.log('V791E_PRIMARY_CONNECTION_STATE_ISOLATION=PASSED');
console.log('V791E_DASHBOARD_DIAGNOSTICS_PANEL=PASSED');
console.log('V791E_DEVICE_HEALTH_DIAGNOSTICS=PASSED');
console.log('V791E_V790D_DIAGNOSTICS_API_REUSED=PASSED');
console.log('V791E_DIAGNOSTICS_DASHBOARD_HEALTH_MEGA8=PASSED');
