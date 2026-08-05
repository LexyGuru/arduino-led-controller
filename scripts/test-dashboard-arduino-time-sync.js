'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboard = fs.readFileSync(
  'desktop-tauri/src/pages/DashboardPage.tsx',
  'utf8',
);
const app = fs.readFileSync(
  'desktop-tauri/src/App.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'desktop-tauri/src/hooks/useController.ts',
  'utf8',
);
const i18n = fs.readFileSync(
  'desktop-tauri/src/i18n/index.tsx',
  'utf8',
);

assert.match(dashboard, /function arduinoClock\(/);
assert.match(dashboard, /status\.clockEpoch \+/);
assert.match(dashboard, /status\.utcOffsetMinutes/);
assert.match(dashboard, /getUTCDay\(\)/);
assert.match(dashboard, /getUTCHours\(\)/);
assert.match(dashboard, /clock: ArduinoClock/);
assert.match(dashboard, /minuteDelta/);
assert.match(dashboard, /next\?\.dayOffset ===\s*0/);
assert.match(dashboard, /dashboard\.today/);
assert.match(dashboard, /dashboard\.tomorrow/);
assert.match(dashboard, /dashboard\.arduinoTime/);
assert.match(dashboard, /dashboard\.syncComputer/);
assert.match(dashboard, /onSyncTime/);
assert.doesNotMatch(
  dashboard,
  /const now\s*=\s*new Date\(\);\s*const currentDay/,
);

assert.match(
  app,
  /onSyncTime=\{\s*controller\s*\.syncTimeWithComputer/,
);
assert.match(controller, /const syncTimeWithComputer/);
assert.match(
  controller,
  /await tauriApi\s*\.syncTimeConfig\(\)/,
);
assert.match(controller, /controller\.timeSynced/);
assert.match(controller, /controller\.timeSyncError/);
assert.match(
  controller,
  /syncTimeWithComputer,\s*saveConfig/,
);

for (const key of [
  'dashboard.today',
  'dashboard.tomorrow',
  'dashboard.arduinoTime',
  'dashboard.timezone',
  'dashboard.utcOffset',
  'dashboard.timeSync',
  'dashboard.synced',
  'dashboard.notSynced',
  'dashboard.syncComputer',
  'controller.timeSynced',
  'controller.timeSyncError',
]) {
  const escaped =
    key.replaceAll('.', '\\.');
  const count =
    (
      i18n.match(
        new RegExp(
          `["']${escaped}["']`,
          'g',
        ),
      ) || []
    ).length;

  assert.equal(
    count,
    3,
    `${key}: HU/EN/DE parity`,
  );
}

console.log(
  'OK: Arduino-idő alapú mai/holnapi schedule és kézi számítógépes időszinkron',
);
