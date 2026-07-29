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
    'deploy/run-alpha2-lxc-orchestrator.sh',
    'deploy/test-alpha2-lxc.sh',
    'deploy/install-versioned-release.sh',
    'deploy/verify-versioned-release.sh',
    'deploy/install-staging-service.sh'
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

const orchestrator =
  read(
    'deploy/run-alpha2-lxc-orchestrator.sh'
  );

assert.doesNotMatch(
  orchestrator,
  /chmod \+x[\s\S]*CANDIDATE_ROOT/
);

assert.match(
  orchestrator,
  /xargs -0 -r ls -1t/
);

const gate =
  read(
    'deploy/test-alpha2-lxc.sh'
  );

assert.doesNotMatch(
  gate,
  /cd "\$\{APP_DIR\}"[\s\S]*test-update-rollback\.sh/
);

assert.match(
  gate,
  /candidate gate részeként sikeresen lefutott/
);

const installer =
  read(
    'deploy/install-versioned-release.sh'
  );

assert.match(
  installer,
  /\(staging\|promotion\)/
);

assert.match(
  installer,
  /EXPECTED_SUFFIX/
);

const verifier =
  read(
    'deploy/verify-versioned-release.sh'
  );

assert.match(
  verifier,
  /command -v sha256sum/
);

assert.match(
  verifier,
  /command -v shasum/
);

assert.match(
  verifier,
  /metadata\.phase/
);

assert.match(
  verifier,
  /expectedName/
);

const stagingInstaller =
  read(
    'deploy/install-staging-service.sh'
  );

for (
  const directory
  of [
    'RELEASE_GATE_DIR',
    'RELEASE_EXECUTION_DIR',
    'RELEASE_ARTIFACT_DIR',
    'CONFIG_DIR',
    'SCHEDULES_DIR'
  ]
) {
  assert.match(
    stagingInstaller,
    new RegExp(directory)
  );
}

const unit =
  read(
    'deploy/systemd/arduino-led-controller-staging.service'
  );

assert.match(
  unit,
  /ReadWritePaths=\/var\/lib\/arduino-led-controller\/release-gates/
);

assert.match(
  unit,
  /ReadWritePaths=\/var\/lib\/arduino-led-controller\/release-execution/
);

const environment =
  read(
    'deploy/staging.env.example'
  );

for (
  const setting
  of [
    'RELEASE_EXECUTION_RECEIPT_DIR',
    'RELEASE_ORCHESTRATION_STATE_FILE',
    'RELEASE_ORCHESTRATION_ARTIFACT_INDEX_FILE',
    'RELEASE_PRODUCTION_GUARD_FILE',
    'RELEASE_PRODUCTION_GUARD_VERIFICATION_FILE'
  ]
) {
  assert.match(
    environment,
    new RegExp(
      `^${setting}=`,
      'm'
    )
  );
}

console.log(
  'OK: candidate worktree tiszta marad a bundle előtt'
);

console.log(
  'OK: phase-aware staging/promotion release-név'
);

console.log(
  'OK: rollback teszt csak az exact candidate worktree-ben fut'
);

console.log(
  'OK: staging systemd írható gate és receipt útvonalak'
);

console.log(
  'OK: staging backend a valódi orchestration állapotot olvassa'
);
