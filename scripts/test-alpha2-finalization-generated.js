'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const client =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'desktop-tauri/src/api/generated/api-v2-client.ts'
    ),
    'utf8'
  );

for (
  const operation
  of [
    'getAlpha2ExecutionReceipts',
    'getAlpha2FinalizationReadiness',
    'verifyAlpha2Finalization',
    'approveAlpha2Finalization',
    'revokeAlpha2FinalizationApproval'
  ]
) {
  assert.match(
    client,
    new RegExp(
      `\\n  ${operation}`
    )
  );
}

console.log(
  'OK: 5 generált alpha.2 finalization API-művelet'
);
