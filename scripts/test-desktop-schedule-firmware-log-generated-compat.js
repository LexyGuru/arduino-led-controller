'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(
  __dirname,
  '..'
);

const client = fs.readFileSync(
  path.join(
    ROOT,
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ),
  'utf8'
);

for (
  const operation
  of [
    'getLocalSchedules',
    'postLocalSchedulesImport',
    'postLocalSchedulesActionsSyncArduino',
    'getLocalSchedulesRunner',
    'postLocalSchedulesRunnerActionsTick',
    'getFirmwareStatus',
    'getFirmwareBackups',
    'postFirmwareActionsUpdate',
    'postFirmwareActionsCancel',
    'postFirmwareActionsRollback',
    'deleteFirmwareBackupsById',
    'getArduinoConsoleLogs',
    'getArduinoConsoleStats',
    'postArduinoConsoleActionsClear',
    'getAuditRecent',
    'getAuditStatus',
    'getEventsRecent',
    'getEventsStatus'
  ]
) {
  assert.match(
    client,
    new RegExp(
      `\\n  ${operation}`
    ),
    `Hiányzó generált művelet: ${operation}`
  );
}

console.log(
  'OK: 18 generált schedule, firmware és napló API-művelet kompatibilis'
);
