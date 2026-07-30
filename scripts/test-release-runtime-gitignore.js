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
  spawnSync
} =
  require('child_process');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const gitignore =
  fs.readFileSync(
    path.join(
      ROOT,
      '.gitignore'
    ),
    'utf8'
  );

assert.match(
  gitignore,
  /^\/release\/$/m
);

assert.doesNotMatch(
  gitignore,
  /^release\/$/m
);

assert.match(
  gitignore,
  /^\/config\/\*$/m
);

assert.match(
  gitignore,
  /^!\/config\/release-secret-allowlist\.json$/m
);

for (
  const relative
  of [
    'server/release/release-error.js',
    'server/release/release-gate-report.js',
    'server/release/release-gate-service.js',
    'server/release/release-sbom.js',
    'server/release/release-provenance.js',
    'server/release/release-secret-scanner.js',
    'server/release/release-evidence.js',
    'server/release/release-execution-receipt.js',
    'server/release/release-finalization-service.js',
    'server/release/alpha2-orchestration-state.js',
    'server/release/alpha2-orchestration-service.js',
    'config/release-secret-allowlist.json'
  ]
) {
  assert.strictEqual(
    fs.existsSync(
      path.join(
        ROOT,
        relative
      )
    ),
    true,
    `Hiányzó release runtime fájl: ${relative}`
  );
}

const temp =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'release-gitignore-test-'
    )
  );

try {
  fs.copyFileSync(
    path.join(
      ROOT,
      '.gitignore'
    ),
    path.join(
      temp,
      '.gitignore'
    )
  );

  for (
    const relative
    of [
      'server/release/release-error.js',
      'server/release/alpha2-orchestration-state.js',
      'config/release-secret-allowlist.json'
    ]
  ) {
    const target =
      path.join(
        temp,
        relative
      );

    fs.mkdirSync(
      path.dirname(
        target
      ),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      target,
      'test\n'
    );
  }

  fs.mkdirSync(
    path.join(
      temp,
      'release'
    ),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    path.join(
      temp,
      'release',
      'runtime-data.json'
    ),
    '{}\n'
  );

  spawnSync(
    'git',
    [
      'init',
      '-q'
    ],
    {
      cwd:
        temp,
      stdio:
        'pipe'
    }
  );

  for (
    const relative
    of [
      'server/release/release-error.js',
      'server/release/alpha2-orchestration-state.js',
      'config/release-secret-allowlist.json'
    ]
  ) {
    const result =
      spawnSync(
        'git',
        [
          'check-ignore',
          '--no-index',
          '-q',
          relative
        ],
        {
          cwd:
            temp
        }
      );

    assert.notStrictEqual(
      result.status,
      0,
      `A forrásfájl nem lehet ignorált: ${relative}`
    );
  }

  const runtimeResult =
    spawnSync(
      'git',
      [
        'check-ignore',
        '--no-index',
        '-q',
        'release/runtime-data.json'
      ],
      {
        cwd:
          temp
      }
    );

  assert.strictEqual(
    runtimeResult.status,
    0,
    'A gyökér release runtime könyvtár továbbra is legyen ignorált.'
  );

  console.log(
    'OK: server/release forráskönyvtár nincs ignorálva'
  );

  console.log(
    'OK: release secret allowlist nincs ignorálva'
  );

  console.log(
    'OK: gyökér release runtime könyvtár továbbra is ignorált'
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
