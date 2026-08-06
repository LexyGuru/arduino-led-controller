'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(
  'desktop-tauri/src/App.tsx',
  'utf8',
);
const dashboard = fs.readFileSync(
  'desktop-tauri/src/pages/DashboardPage.tsx',
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

for (const marker of [
  'function arduinoClock(',
  'clockEpoch',
  'utcOffsetMinutes',
  'dashboard.today',
  'dashboard.tomorrow',
  'dashboard.arduinoTime',
  'dashboard.timezone',
  'dashboard.utcOffset',
  'dashboard.timeSync',
  'dashboard.syncComputer',
  'onSyncTime',
]) {
  assert.match(
    dashboard,
    new RegExp(
      marker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      ),
    ),
  );
}

for (const marker of [
  'const syncTimeWithComputer',
  '.syncTimeConfig()',
  'controller.timeSynced',
  'controller.timeSyncError',
]) {
  assert.match(
    controller,
    new RegExp(
      marker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      ),
    ),
  );
}

const syncPropStart =
  app.indexOf('onSyncTime={');

assert.ok(
  syncPropStart >= 0,
  'Az App.tsx fájlban hiányzik az onSyncTime prop',
);

const syncPropEnd =
  app.indexOf('/>', syncPropStart);

assert.ok(
  syncPropEnd > syncPropStart,
  'Az onSyncTime propot tartalmazó DashboardPage blokk vége nem található',
);

const syncBlock =
  app.slice(
    syncPropStart,
    syncPropEnd,
  );

for (const marker of [
  'runAudited(',
  "source:'time'",
  "action:'time.sync'",
  "t('audit.timeSyncStart')",
  "t('audit.timeSyncSuccess')",
  'controller.syncTimeWithComputer',
]) {
  assert.match(
    syncBlock,
    new RegExp(
      marker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      ),
    ),
    `Hiányzó auditált időszinkron marker: ${marker}`,
  );
}

assert.doesNotMatch(
  syncBlock,
  /onSyncTime=\{\s*controller\s*\.syncTimeWithComputer/,
  'A régi, audit nélküli közvetlen időszinkron handler nem térhet vissza',
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
  'audit.timeSyncStart',
  'audit.timeSyncSuccess',
]) {
  const escaped =
    key.replaceAll('.', '\\.');
  const count = (
    i18n.match(
      new RegExp(
        `['"]${escaped}['"]\\s*:`,
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
  'OK: Arduino-idő alapú mai/holnapi schedule és auditált kézi számítógépes időszinkron',
);
