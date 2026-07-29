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
    '/api/v2/release/lxc-orchestration',
    '/api/v2/release/lxc-artifacts',
    '/api/v2/release/actions/verify-lxc-orchestration'
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
  /alpha2OrchestrationService/
);

console.log(
  'OK: 3 alpha.2 LXC orchestration API route'
);
