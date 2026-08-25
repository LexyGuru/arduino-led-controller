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
const panel = fs.readFileSync(
  'desktop-tauri/src/components/v55/DiagnosticsPanel.tsx',
  'utf8'
);

const v791eTest = fs.readFileSync(
  'scripts/test-diagnostics-dashboard-health-v791e.js',
  'utf8'
);

for (const marker of [
  'function diagnosticsGovernorInterval(',
  'intervalMs: 15_000',
  'intervalMs: 30_000',
  'intervalMs: 60_000',
  'timeoutCount > previousTimeouts',
  'httpMaxMs >= 500',
  'rssi <= -75',
  'window.setTimeout(',
  'diagnosticsPollIntervalRef.current',
  'diagnosticsPollIntervalMs,'
]) {
  assert.ok(
    controller.includes(marker),
    marker
  );
}

const refreshStart =
  controller.indexOf(
    'const refreshDiagnostics ='
  );
const refreshEnd =
  controller.indexOf(
    'const refreshFirmware =',
    refreshStart
  );

assert.ok(
  refreshStart >= 0 &&
  refreshEnd > refreshStart
);

const diagnosticsBlock =
  controller.slice(
    refreshStart,
    refreshEnd
  );

const failureStart =
  diagnosticsBlock.indexOf(
    'setDiagnosticsError(message);'
  );
const failureEnd =
  diagnosticsBlock.indexOf(
    'setConnectionHealth(',
    Math.max(failureStart, 0)
  );

assert.ok(
  failureStart >= 0 &&
  failureEnd > failureStart,
  'diagnostics failure-backoff region missing'
);

const failureBlock =
  diagnosticsBlock.slice(
    failureStart,
    failureEnd
  );

assert.ok(
  failureBlock.includes(
    'diagnosticsPollIntervalRef.current'
  )
);
assert.ok(
  failureBlock.includes(
    'setDiagnosticsPollIntervalMs('
  )
);
assert.ok(
  failureBlock.includes('60_000')
);

assert.ok(
  !diagnosticsBlock.includes(
    "state: 'offline'"
  )
);
assert.ok(
  !diagnosticsBlock.includes(
    "state: 'recovering'"
  )
);

assert.ok(
  app.includes(
    'diagnosticsPollIntervalMs={controller.diagnosticsPollIntervalMs}'
  )
);
assert.ok(
  dashboard.includes(
    'diagnosticsPollIntervalMs: number;'
  )
);
assert.ok(
  dashboard.includes(
    'pollIntervalMs={diagnosticsPollIntervalMs}'
  )
);

const returnMatches = [...controller.matchAll(/^\s*return \{$/gm)];
assert.ok(returnMatches.length > 0, 'controller hook return missing');
const finalReturn = controller.slice(
  returnMatches[returnMatches.length - 1].index
);
assert.ok(finalReturn.includes('diagnosticsPollIntervalMs,'));
assert.ok(!finalReturn.includes('\\n'));
assert.ok(
  panel.includes(
    'Polling governor'
  )
);
assert.ok(
  panel.includes(
    'Math.round(pollIntervalMs / 1000)'
  )
);

assert.ok(
  v791eTest.includes(
    'dashboard diagnostics visibility guard missing'
  )
);
assert.ok(
  v791eTest.includes(
    'document\\.visibilityState\\s*===\\s*'
  )
);
assert.ok(
  !v791eTest.includes(
    'controller.includes("document.visibilityState === \'visible\'")'
  )
);

// MEGA9 remains present.
for (const marker of [
  'slice(-60)',
  'v792-diagnostics-warning-list',
  'HTTP max Δ',
  'Scheduler Δ',
  'Render Δ'
]) {
  assert.ok(panel.includes(marker), marker);
}

console.log('V793E_V791E_VISIBLE_GATE_REGEX_MIGRATION=PASSED');
console.log('V793E_V791E_VISIBILITY_CONTRACT_PRESERVED=PASSED');
console.log('V793E_ADAPTIVE_DIAGNOSTICS_GOVERNOR=PASSED');
console.log('V793E_HEALTHY_15S_CADENCE=PASSED');
console.log('V793E_WEAK_WIFI_30S_BACKOFF=PASSED');
console.log('V793E_LATENCY_TIMEOUT_60S_BACKOFF=PASSED');
console.log('V793E_FAILURE_60S_BACKOFF=PASSED');
console.log('V793E_RECURSIVE_TIMEOUT_SCHEDULER=PASSED');
console.log('V793E_PRIMARY_CONNECTION_STATE_ISOLATION=PASSED');
console.log('V793E_MEGA9_TRENDS_WARNINGS_PRESERVED=PASSED');
console.log('V793E_ADAPTIVE_DIAGNOSTICS_POLLING_GOVERNOR_MEGA10=PASSED');
