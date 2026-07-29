'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const client =
  fs.readFileSync(
    path.join(
      ROOT,
      'desktop-tauri/src/api/generated/api-v2-client.ts'
    ),
    'utf8'
  );

for (
  const operation
  of [
    'getArduinoStatus',
    'getArduinoMonitor',
    'postArduinoMonitorActionsPoll',
    'getLeds',
    'getLedsById',
    'putLedsById',
    'postLedsActionsAllOn',
    'postLedsActionsAllOff',
    'postLedsActionsReset'
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
  'OK: 9 generált Arduino és LED API-művelet kompatibilis'
);
