'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const source =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'server',
      'api',
      'v2',
      'release-routes.js'
    ),
    'utf8'
  );

for (
  const route
  of [
    '/api/v2/release/execution-receipts',
    '/api/v2/release/finalization-readiness',
    '/api/v2/release/actions/verify-finalization',
    '/api/v2/release/actions/approve-finalization',
    '/api/v2/release/finalization-approval'
  ]
) {
  assert.match(
    source,
    new RegExp(
      route.replace(
        /\//g,
        '\\/'
      )
    )
  );
}

assert.match(
  source,
  /releaseFinalizationService/
);

assert.match(
  source,
  /req\.apiPrincipal/
);

console.log(
  'OK: 5 alpha.2 finalization API route'
);

console.log(
  'OK: release permission és principal bekötés'
);
