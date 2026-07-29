'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

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

const temp =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'alpha2-production-guard-'
    )
  );

try {
  execFileSync(
    'git',
    [
      'init',
      '-q',
      temp
    ]
  );

  execFileSync(
    'git',
    [
      '-C',
      temp,
      'config',
      'user.email',
      'test@example.invalid'
    ]
  );

  execFileSync(
    'git',
    [
      '-C',
      temp,
      'config',
      'user.name',
      'Test'
    ]
  );

  fs.writeFileSync(
    path.join(
      temp,
      'file.txt'
    ),
    'stable\n'
  );

  execFileSync(
    'git',
    [
      '-C',
      temp,
      'add',
      'file.txt'
    ]
  );

  execFileSync(
    'git',
    [
      '-C',
      temp,
      'commit',
      '-qm',
      'baseline'
    ]
  );

  execFileSync(
    'git',
    [
      '-C',
      temp,
      'branch',
      '-M',
      'main'
    ]
  );

  const fakeBin =
    path.join(
      temp,
      'bin'
    );

  fs.mkdirSync(
    fakeBin
  );

  for (
    const [
      name,
      body
    ]
    of [
      [
        'systemctl',
        '#!/usr/bin/env bash\nexit 0\n'
      ],
      [
        'curl',
        '#!/usr/bin/env bash\nexit 0\n'
      ]
    ]
  ) {
    const file =
      path.join(
        fakeBin,
        name
      );

    fs.writeFileSync(
      file,
      body,
      {
        mode: 0o755
      }
    );
  }

  const snapshot =
    path.join(
      temp,
      'guard.json'
    );

  const verification =
    path.join(
      temp,
      'verify.json'
    );

  const environment = {
    ...process.env,
    APP_DIR:
      temp,
    SERVICE_NAME:
      'test-service',
    HEALTH_URL:
      'http://test/health',
    SYSTEMCTL_COMMAND:
      path.join(
        fakeBin,
        'systemctl'
      ),
    CURL_COMMAND:
      path.join(
        fakeBin,
        'curl'
      ),
    VERIFICATION_FILE:
      verification
  };

  execFileSync(
    'bash',
    [
      path.join(
        ROOT,
        'deploy/alpha2-production-guard.sh'
      ),
      'snapshot',
      snapshot
    ],
    {
      env:
        environment
    }
  );

  execFileSync(
    'bash',
    [
      path.join(
        ROOT,
        'deploy/alpha2-production-guard.sh'
      ),
      'verify',
      snapshot
    ],
    {
      env:
        environment
    }
  );

  assert.strictEqual(
    JSON.parse(
      fs.readFileSync(
        verification,
        'utf8'
      )
    ).passed,
    true
  );

  fs.writeFileSync(
    path.join(
      temp,
      'file.txt'
    ),
    'changed\n'
  );

  assert.throws(
    () =>
      execFileSync(
        'bash',
        [
          path.join(
            ROOT,
            'deploy/alpha2-production-guard.sh'
          ),
          'verify',
          snapshot
        ],
        {
          env:
            environment,
          stdio:
            'pipe'
        }
      )
  );

  console.log(
    'OK: production guard snapshot és változatlan állapot'
  );

  console.log(
    'OK: working-tree változás blokkolása'
  );
} finally {
  fs.rmSync(
    temp,
    {
      recursive: true,
      force: true
    }
  );
}
