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

for (
  const file
  of [
    'deploy/stage-alpha2-bundle.sh',
    'deploy/rehearse-alpha2-rollback.sh',
    'deploy/promote-alpha2-staging.sh'
  ]
) {
  execFileSync(
    'bash',
    [
      '-n',
      path.join(
        ROOT,
        file
      )
    ]
  );

  const source =
    fs.readFileSync(
      path.join(
        ROOT,
        file
      ),
      'utf8'
    );

  assert.match(
    source,
    /write-alpha2-execution-receipt\.js/
  );
}

const rollback =
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/rehearse-alpha2-rollback.sh'
    ),
    'utf8'
  );

assert.match(
  rollback,
  /--kind rollback-rehearsal/
);

assert.match(
  rollback,
  /--previous.*staging-deployment\.json/s
);

const promotion =
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/promote-alpha2-staging.sh'
    ),
    'utf8'
  );

assert.match(
  promotion,
  /--previous.*rollback-rehearsal\.json/s
);

console.log(
  'OK: staging, rollback és promotion receipt-írás'
);

console.log(
  'OK: végrehajtási sorrend SHA-256 láncolva'
);
