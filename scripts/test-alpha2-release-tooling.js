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

function read(
  relative
) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

const runner =
  read(
    'deploy/run-alpha2-release-gate.sh'
  );

const installer =
  read(
    'deploy/install-versioned-release.sh'
  );

const rollback =
  read(
    'deploy/rollback-versioned-release.sh'
  );

const staging =
  read(
    'deploy/systemd/arduino-led-controller-staging.service'
  );

assert.match(
  runner,
  /worktree add/
);

assert.match(
  runner,
  /verify-release-gate-report\.js/
);

assert.match(
  installer,
  /rollback/
);

assert.match(
  installer,
  /HEALTH_URL/
);

assert.match(
  rollback,
  /current/
);

assert.match(
  staging,
  /arduino-led-controller-staging/
);

assert.match(
  staging,
  /NoNewPrivileges=true/
);

console.log(
  'OK: izolált candidate worktree és gate riport'
);
console.log(
  'OK: staging telepítés health rollbackkel'
);
console.log(
  'OK: külön verziózott rollback és hardened systemd unit'
);
