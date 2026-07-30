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

const domain =
  fs.readFileSync(
    path.join(
      ROOT,
      'desktop-tauri/src/api/runtime/domain/system-api.mjs'
    ),
    'utf8'
  );

const page =
  fs.readFileSync(
    path.join(
      ROOT,
      'desktop-tauri/src/pages/V5SystemPage.tsx'
    ),
    'utf8'
  );

const panel =
  fs.readFileSync(
    path.join(
      ROOT,
      'desktop-tauri/src/components/v5/V5ReleaseFinalizationPanel.tsx'
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
    domain,
    new RegExp(
      operation
    )
  );
}

assert.match(
  domain,
  /FINALIZE_ALPHA2_VERSION_SYNC/
);

assert.match(
  page,
  /V5ReleaseFinalizationPanel/
);

assert.match(
  panel,
  /Staging telepítés/
);

assert.match(
  panel,
  /Rollback-próba/
);

assert.match(
  panel,
  /Promotion telepítés/
);

console.log(
  'OK: desktop finalization domain és kötelező megerősítés'
);

console.log(
  'OK: execution receipt-lánc panel bekötve'
);
