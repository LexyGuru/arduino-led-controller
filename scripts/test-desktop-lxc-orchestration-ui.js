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
      'desktop-tauri/src/components/v5/V5LxcOrchestrationPanel.tsx'
    ),
    'utf8'
  );

for (
  const operation
  of [
    'getAlpha2LxcOrchestration',
    'getAlpha2LxcArtifacts',
    'verifyAlpha2LxcOrchestration'
  ]
) {
  assert.match(
    domain,
    new RegExp(operation)
  );
}

assert.match(
  page,
  /V5LxcOrchestrationPanel/
);

assert.match(
  panel,
  /EXECUTE_ALPHA2_PROMOTION/
);

assert.match(
  panel,
  /Rollback-próba/
);

console.log(
  'OK: desktop LXC orchestration domain és panel'
);
