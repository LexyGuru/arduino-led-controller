'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const {
  execFileSync
} =
  require('child_process');

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

for (
  const relative
  of [
    'deploy/build-alpha2-release-bundle.sh',
    'deploy/verify-alpha2-release-bundle.sh',
    'deploy/stage-alpha2-bundle.sh',
    'deploy/promote-alpha2-staging.sh',
    'deploy/rehearse-alpha2-rollback.sh',
    'deploy/install-versioned-release.sh'
  ]
) {
  execFileSync(
    'bash',
    [
      '-n',
      path.join(
        ROOT,
        relative
      )
    ]
  );
}

const build =
  read(
    'deploy/build-alpha2-release-bundle.sh'
  );

const verify =
  read(
    'deploy/verify-alpha2-release-bundle.sh'
  );

const install =
  read(
    'deploy/install-versioned-release.sh'
  );

const rehearsal =
  read(
    'deploy/rehearse-alpha2-rollback.sh'
  );

assert.match(
  build,
  /git[\s\S]*archive/
);

assert.match(
  build,
  /build-alpha2-release-evidence\.js/
);

assert.match(
  build,
  /RELEASE-METADATA\.json/
);

assert.match(
  verify,
  /verify-alpha2-release-evidence\.js/
);

assert.match(
  verify,
  /evidenceSha256/
);

assert.match(
  install,
  /REQUIRE_RELEASE_EVIDENCE/
);

assert.match(
  install,
  /verify-alpha2-release-bundle\.sh/
);

assert.match(
  rehearsal,
  /\*staging\*/
);

assert.match(
  rehearsal,
  /127\.0\.0\.1:1\/expected-health-failure/
);

assert.match(
  rehearsal,
  /current változatlan/
);

console.log(
  'OK: evidence bundle build és verify eszközök'
);

console.log(
  'OK: staging installer kötelező evidence ellenőrzése'
);

console.log(
  'OK: staging-only automatikus rollback-próba'
);
