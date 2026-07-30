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

const scripts = [
  'deploy/run-alpha2-lxc-orchestrator.sh',
  'deploy/verify-alpha2-lxc-preflight.sh',
  'deploy/alpha2-production-guard.sh',
  'deploy/collect-alpha2-execution-artifacts.sh',
  'deploy/run-alpha2-release-gate.sh',
  'deploy/test-alpha2-lxc.sh'
];

for (
  const relative
  of scripts
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
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/run-alpha2-lxc-orchestrator.sh'
    ),
    'utf8'
  );

assert.match(
  orchestrator,
  /gate-stage/
);

assert.match(
  orchestrator,
  /PROMOTION_CONFIRM/
);

assert.match(
  orchestrator,
  /EXECUTE_ALPHA2_PROMOTION/
);

assert.doesNotMatch(
  orchestrator,
  /case[\s\S]*\ball\)/
);

assert.match(
  orchestrator,
  /worktree add[\s\S]*--detach/
);

assert.match(
  orchestrator,
  /alpha2-production-guard\.sh/
);


const bundleBuilder =
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/build-alpha2-release-bundle.sh'
    ),
    'utf8'
  );

assert.match(
  bundleBuilder,
  /NAME="arduino-led-controller-\$\{VERSION\}-\$\{PHASE\}-\$\{SHORT_COMMIT\}"/
);

const gate =
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/run-alpha2-release-gate.sh'
    ),
    'utf8'
  );

const lxc =
  fs.readFileSync(
    path.join(
      ROOT,
      'deploy/test-alpha2-lxc.sh'
    ),
    'utf8'
  );

assert.match(
  gate,
  /\[\[ -e "\$\{APP_DIR\}\/\.git" \]\]/
);

assert.match(
  lxc,
  /CANDIDATE_SCRIPT/
);

console.log(
  'OK: kétlépcsős LXC orchestrator és explicit promotion megerősítés'
);

console.log(
  'OK: exact candidate worktree és production guard'
);

console.log(
  'OK: Git worktree kompatibilis gate scriptek'
);

console.log(
  'OK: staging és promotion fizikailag külön release-név'
);
