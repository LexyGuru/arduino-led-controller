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
    'getAlpha2LxcOrchestration',
    'getAlpha2LxcArtifacts',
    'verifyAlpha2LxcOrchestration'
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
  'OK: 3 generált LXC orchestration API-művelet'
);
