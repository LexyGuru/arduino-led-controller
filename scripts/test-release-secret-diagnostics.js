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
      'build-alpha2-release-evidence.js'
    ),
    'utf8'
  );

assert.match(
  source,
  /Titokszivárgás-gyanús találatok/
);

assert.match(
  source,
  /secretScan\.findings/
);

assert.doesNotMatch(
  source,
  /console\.(?:error|log)\([^)]*rawSecret/
);

console.log(
  'OK: sikertelen release scan redaktált diagnosztikát ír'
);
