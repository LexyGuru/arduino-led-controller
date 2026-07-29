'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertContains(text, value, message) {
  assert.ok(text.includes(value), message || `Hiányzó tartalom: ${value}`);
}

function assertNotContains(text, value, message) {
  assert.ok(!text.includes(value), message || `Tiltott tartalom: ${value}`);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    ...options
  });
}

for (const relativePath of [
  'deploy/install-staging-service.sh',
  'deploy/install-versioned-release.sh',
  'deploy/stage-alpha2-bundle.sh'
]) {
  const result = run('bash', ['-n', relativePath]);
  assert.strictEqual(
    result.status,
    0,
    `${relativePath} bash szintaktikai hiba:\n${result.stderr}`
  );
}

const envExample = read('deploy/staging.env.example');
for (const required of [
  'BIND_HOST=127.0.0.1',
  'ARDUINO_IP=127.0.0.1',
  'ARDUINO_PORT=65535',
  'ARDUINO_API_PATH=/__alpha2_staging_disabled__',
  'ARDUINO_API_KEY=<STAGING_DISABLED_API_KEY>',
  'ARDUINO_STATUS_MONITOR_ENABLED=0',
  'FIRMWARE_DIR=/var/lib/arduino-led-controller-staging/firmware',
  'LOCAL_SCHEDULE_RUNNER_MODE=manual',
  'LEGACY_SUPPRESS_LOCAL_SCHEDULE_CRON=1',
  'LEGACY_SUPPRESS_STATUS_CRON=1'
]) {
  assertContains(envExample, required);
}
assertNotContains(envExample, '10.0.0.123');
assertNotContains(envExample, '10.0.0.117');

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    values.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }
  return values;
}

const stagingEnvValues = parseEnv(envExample);
assert.strictEqual(stagingEnvValues.get('BIND_HOST'), '127.0.0.1');
assert.strictEqual(stagingEnvValues.get('ARDUINO_IP'), '127.0.0.1');
assert.strictEqual(stagingEnvValues.get('ARDUINO_PORT'), '65535');
assert.ok(
  stagingEnvValues.get('ARDUINO_API_PATH').startsWith('/') &&
    stagingEnvValues.get('ARDUINO_API_PATH').length >= 8,
  'A staging Arduino API pathnak meg kell felelnie a runtime validációnak.'
);
assert.ok(
  stagingEnvValues.get('ARDUINO_API_KEY').length >= 16,
  'A staging Arduino API key helyőrzőnek meg kell felelnie a runtime validációnak.'
);

const stagingInstaller = read('deploy/install-staging-service.sh');
for (const required of [
  'upsert_env BIND_HOST "${STAGING_BIND_HOST}"',
  'upsert_env ARDUINO_IP "${STAGING_ARDUINO_IP}"',
  'upsert_env ARDUINO_PORT "${STAGING_ARDUINO_PORT}"',
  'upsert_env ARDUINO_API_PATH "${STAGING_ARDUINO_API_PATH}"',
  'upsert_env ARDUINO_API_KEY "${STAGING_ARDUINO_API_KEY}"',
  '"${FIRMWARE_DIR}"',
  '"${EVENT_ARCHIVE_DIR}"',
  'server-settings.pre-alpha2-isolation',
  '"${SYSTEMCTL_COMMAND}" daemon-reload'
]) {
  assertContains(stagingInstaller, required);
}
assertNotContains(
  stagingInstaller,
  '/etc/arduino-led-controller.env',
  'A staging telepítő nem olvashatja a produkciós env-fájlt.'
);
assertNotContains(stagingInstaller, '10.0.0.123');
assertNotContains(stagingInstaller, '10.0.0.117');

const stageScript = read('deploy/stage-alpha2-bundle.sh');
assertContains(stageScript, 'deploy/install-staging-service.sh');
assertContains(stageScript, "AUTO_INSTALL_STAGING_SERVICE:-1");
assertContains(stageScript, 'EVIDENCE_PHASE=staging');

const releaseInstaller = read('deploy/install-versioned-release.sh');
for (const required of [
  'HEALTH_RESPONSE_FILE',
  "health-body:",
  'fail_after_activation',
  'cleanup_failed_target',
  'handle_error',
  'on_exit',
  'trap on_exit EXIT',
  'trap - EXIT',
  'rollback',
  '"${SYSTEMCTL_COMMAND}" \\\n        stop',
  'a staging release nem lett ready állapotú'
]) {
  assertContains(releaseInstaller, required);
}

function writeExecutable(file, content) {
  fs.writeFileSync(file, content, { mode: 0o755 });
  fs.chmodSync(file, 0o755);
}

function runInstallerReconciliation() {
  // A deploy script Linux/LXC célú és GNU install -D opciót használ. macOS-on
  // a statikus szerződésellenőrzések futnak, Linuxon a teljes izolált telepítőpróba.
  if (process.platform !== 'linux') {
    return;
  }

  const testRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alpha2-staging-installer-')
  );

  try {
    const binDir = path.join(testRoot, 'bin');
    const installRoot = path.join(testRoot, 'install');
    const releasesDir = path.join(installRoot, 'releases');
    const currentLink = path.join(installRoot, 'current');
    const dataDir = path.join(testRoot, 'data');
    const configDir = path.join(testRoot, 'config');
    const schedulesDir = path.join(dataDir, 'schedules');
    const firmwareDir = path.join(dataDir, 'firmware');
    const eventArchiveDir = path.join(dataDir, 'event-archive');
    const gateDir = path.join(testRoot, 'release-gates');
    const executionDir = path.join(testRoot, 'release-execution');
    const artifactDir = path.join(executionDir, 'artifacts');
    const envTarget = path.join(testRoot, 'staging.env');
    const unitSource = path.join(testRoot, 'staging.service');
    const unitTarget = path.join(testRoot, 'installed-staging.service');
    const systemctlLog = path.join(testRoot, 'systemctl.log');

    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(unitSource, '[Service]\nType=simple\n');
    fs.writeFileSync(
      envTarget,
      [
        'CUSTOM_STAGING_VALUE=preserved',
        'BIND_HOST=0.0.0.0',
        'ARDUINO_IP=10.0.0.123',
        'ARDUINO_PORT=80',
        'ARDUINO_API_PATH=/production',
        ['ARDUINO_API_', 'KEY=production-like-value'].join(''),
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(configDir, 'server-settings.json'),
      `${JSON.stringify({ arduinoIP: '10.0.0.123', arduinoPort: 80 }, null, 2)}\n`
    );

    const fakeId = path.join(binDir, 'id');
    writeExecutable(
      fakeId,
      '#!/bin/sh\nif [ "${1:-}" = "-u" ]; then echo 0; exit 0; fi\nexec /usr/bin/id "$@"\n'
    );
    const fakeSystemctl = path.join(binDir, 'systemctl');
    writeExecutable(
      fakeSystemctl,
      `#!/bin/sh\nprintf '%s\n' "$*" >> "${systemctlLog}"\nexit 0\n`
    );

    const result = run('bash', ['deploy/install-staging-service.sh'], {
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
        UNIT_SOURCE: unitSource,
        UNIT_TARGET: unitTarget,
        ENV_SOURCE: path.join(ROOT, 'deploy/staging.env.example'),
        ENV_TARGET: envTarget,
        INSTALL_ROOT: installRoot,
        RELEASES_DIR: releasesDir,
        CURRENT_LINK: currentLink,
        DATA_DIR: dataDir,
        CONFIG_DIR: configDir,
        SCHEDULES_DIR: schedulesDir,
        FIRMWARE_DIR: firmwareDir,
        EVENT_ARCHIVE_DIR: eventArchiveDir,
        RELEASE_GATE_DIR: gateDir,
        RELEASE_EXECUTION_DIR: executionDir,
        RELEASE_ARTIFACT_DIR: artifactDir,
        SYSTEMCTL_COMMAND: fakeSystemctl
      }
    });

    assert.strictEqual(
      result.status,
      0,
      `Staging installer teszthiba:\n${result.stdout}\n${result.stderr}`
    );

    const installedEnvText = fs.readFileSync(envTarget, 'utf8');
    const installedEnv = parseEnv(installedEnvText);
    assert.strictEqual(installedEnv.get('CUSTOM_STAGING_VALUE'), 'preserved');
    assert.strictEqual(installedEnv.get('BIND_HOST'), '127.0.0.1');
    assert.strictEqual(installedEnv.get('ARDUINO_IP'), '127.0.0.1');
    assert.strictEqual(installedEnv.get('ARDUINO_PORT'), '65535');
    assert.strictEqual(installedEnv.get('FIRMWARE_DIR'), firmwareDir);
    assertNotContains(installedEnvText, '10.0.0.123');
    assertNotContains(installedEnvText, '10.0.0.117');

    for (const directory of [
      installRoot,
      releasesDir,
      dataDir,
      configDir,
      schedulesDir,
      firmwareDir,
      eventArchiveDir,
      gateDir,
      executionDir,
      artifactDir
    ]) {
      assert.strictEqual(fs.statSync(directory).isDirectory(), true, directory);
    }

    assert.strictEqual(
      fs.existsSync(path.join(configDir, 'server-settings.json')),
      false,
      'A staging LAN-célt tartalmazó runtime settings fájlt karanténba kell helyezni.'
    );
    const backups = fs.readdirSync(configDir).filter((name) =>
      name.startsWith('server-settings.pre-alpha2-isolation.')
    );
    assert.strictEqual(backups.length, 1);

    const systemctlCalls = fs.readFileSync(systemctlLog, 'utf8');
    assertContains(systemctlCalls, 'daemon-reload');
    assertContains(systemctlCalls, 'enable arduino-led-controller-staging.service');
    assertNotContains(systemctlCalls, 'arduino-led-controller.service');
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

function makeArchive(testRoot, suffix) {
  const shortCommit = suffix.repeat(12).slice(0, 12);
  const commit = suffix.repeat(40).slice(0, 40);
  const name = `arduino-led-controller-5.0.0-alpha.1-staging-${shortCommit}`;
  const payloadRoot = path.join(testRoot, 'payload');
  const releaseRoot = path.join(payloadRoot, name);
  fs.mkdirSync(releaseRoot, { recursive: true });
  fs.writeFileSync(
    path.join(releaseRoot, 'RELEASE-METADATA.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      name,
      version: '5.0.0-alpha.1',
      commit
    }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(releaseRoot, 'server2_final.js'), "'use strict';\n");

  const archive = path.join(testRoot, `${name}.tar.gz`);
  const tar = spawnSync(
    'tar',
    ['-czf', archive, '-C', payloadRoot, name],
    { encoding: 'utf8' }
  );
  assert.strictEqual(tar.status, 0, tar.stderr);
  fs.writeFileSync(`${archive}.sha256`, `test  ${path.basename(archive)}\n`);
  return { archive, name };
}

function makeHarness(testRoot) {
  const binDir = path.join(testRoot, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const systemctlLog = path.join(testRoot, 'systemctl.log');

  const fakeSystemctl = path.join(binDir, 'systemctl');
  writeExecutable(
    fakeSystemctl,
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "${systemctlLog}"\nexit 0\n`
  );

  const fakeCurl = path.join(binDir, 'curl');
  writeExecutable(
    fakeCurl,
    `#!/bin/sh\nout=''\nwhile [ "$#" -gt 0 ]; do\n  case "$1" in\n    --output) out="$2"; shift 2 ;;\n    --write-out) shift 2 ;;\n    *) shift ;;\n  esac\ndone\nprintf '%s\\n' '{"ok":false,"status":"not-ready","checks":[{"name":"arduinoApiPath","ok":false,"code":"ARDUINO_API_PATH_INVALID"}]}' > "$out"\nprintf '503'\nexit 22\n`
  );

  const fakeFind = path.join(binDir, 'find');
  writeExecutable(
    fakeFind,
    '#!/bin/sh\nroot="$1"\nfor candidate in "$root"/*; do\n  if [ -d "$candidate" ]; then\n    printf "%s\\n" "$candidate"\n    exit 0\n  fi\ndone\nexit 0\n'
  );

  const verifyScript = path.join(binDir, 'verify.sh');
  writeExecutable(verifyScript, '#!/bin/sh\nexit 0\n');

  return {
    binDir,
    fakeSystemctl,
    fakeCurl,
    verifyScript,
    systemctlLog
  };
}

function runFailedInstall({ withPreviousRelease }) {
  const testRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alpha2-staging-isolation-')
  );

  try {
    const { archive, name } = makeArchive(
      testRoot,
      withPreviousRelease ? 'b' : 'a'
    );
    const harness = makeHarness(testRoot);
    const installRoot = path.join(testRoot, 'install');
    const releasesDir = path.join(installRoot, 'releases');
    const currentLink = path.join(installRoot, 'current');
    fs.mkdirSync(releasesDir, { recursive: true });

    let previousTarget = null;
    if (withPreviousRelease) {
      previousTarget = path.join(releasesDir, 'previous-release');
      fs.mkdirSync(previousTarget, { recursive: true });
      fs.symlinkSync(previousTarget, currentLink);
    }

    const result = run(
      'bash',
      ['deploy/install-versioned-release.sh', archive],
      {
        env: {
          ...process.env,
          PATH: `${harness.binDir}${path.delimiter}${process.env.PATH || ''}`,
          CHECKSUM_FILE: `${archive}.sha256`,
          INSTALL_ROOT: installRoot,
          RELEASES_DIR: releasesDir,
          CURRENT_LINK: currentLink,
          SERVICE_NAME: 'arduino-led-controller-staging',
          HEALTH_URL: 'http://127.0.0.1:3100/health/ready',
          HEALTH_RETRIES: '1',
          HEALTH_DELAY_SECONDS: '0',
          INSTALL_DEPENDENCIES: '0',
          SYSTEMCTL_COMMAND: harness.fakeSystemctl,
          CURL_COMMAND: harness.fakeCurl,
          VERIFY_SCRIPT: harness.verifyScript,
          REQUIRE_RELEASE_EVIDENCE: '0'
        }
      }
    );

    assert.notStrictEqual(result.status, 0, 'A hibás readiness nem lehet sikeres.');
    const output = `${result.stdout}\n${result.stderr}`;
    assertContains(output, 'HTTP 503');
    assertContains(output, 'health-body:');
    assertContains(output, 'ARDUINO_API_PATH_INVALID');

    const failedTarget = path.join(releasesDir, name);
    assert.strictEqual(
      fs.existsSync(failedTarget),
      false,
      'A hibás új release könyvtára nem maradhat aktív telepítésként.'
    );

    const systemctlCalls = fs.readFileSync(harness.systemctlLog, 'utf8');
    assertContains(systemctlCalls, 'restart arduino-led-controller-staging');

    if (withPreviousRelease) {
      assert.strictEqual(fs.lstatSync(currentLink).isSymbolicLink(), true);
      assert.strictEqual(fs.readlinkSync(currentLink), previousTarget);
      const restartCount = systemctlCalls
        .split('\n')
        .filter((line) => line === 'restart arduino-led-controller-staging')
        .length;
      assert.strictEqual(restartCount, 2, 'A rollbacknak újra kell indítania az előző release-t.');
      assertNotContains(systemctlCalls, 'stop arduino-led-controller-staging');
    } else {
      assert.strictEqual(fs.existsSync(currentLink), false);
      assertContains(systemctlCalls, 'stop arduino-led-controller-staging');
    }
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

function runDependencyFailureCleanup() {
  const testRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alpha2-staging-dependency-failure-')
  );

  try {
    const { archive, name } = makeArchive(testRoot, 'c');
    const harness = makeHarness(testRoot);
    const installRoot = path.join(testRoot, 'install');
    const releasesDir = path.join(installRoot, 'releases');
    const currentLink = path.join(installRoot, 'current');
    fs.mkdirSync(releasesDir, { recursive: true });

    const fakeNpm = path.join(harness.binDir, 'npm');
    writeExecutable(fakeNpm, '#!/bin/sh\nexit 42\n');

    const result = run(
      'bash',
      ['deploy/install-versioned-release.sh', archive],
      {
        env: {
          ...process.env,
          PATH: `${harness.binDir}${path.delimiter}${process.env.PATH || ''}`,
          CHECKSUM_FILE: `${archive}.sha256`,
          INSTALL_ROOT: installRoot,
          RELEASES_DIR: releasesDir,
          CURRENT_LINK: currentLink,
          SERVICE_NAME: 'arduino-led-controller-staging',
          HEALTH_URL: 'http://127.0.0.1:3100/health/ready',
          INSTALL_DEPENDENCIES: '1',
          NPM_COMMAND: fakeNpm,
          SYSTEMCTL_COMMAND: harness.fakeSystemctl,
          CURL_COMMAND: harness.fakeCurl,
          VERIFY_SCRIPT: harness.verifyScript,
          REQUIRE_RELEASE_EVIDENCE: '0'
        }
      }
    );

    assert.notStrictEqual(result.status, 0, 'A hibás npm ci nem lehet sikeres.');
    assert.strictEqual(
      fs.existsSync(path.join(releasesDir, name)),
      false,
      'Az aktiválás előtti hibás candidate könyvtárát is el kell távolítani.'
    );
    assert.strictEqual(fs.existsSync(currentLink), false);

    if (fs.existsSync(harness.systemctlLog)) {
      const systemctlCalls = fs.readFileSync(harness.systemctlLog, 'utf8');
      assertNotContains(systemctlCalls, 'restart arduino-led-controller-staging');
      assertNotContains(systemctlCalls, 'stop arduino-led-controller-staging');
    }
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

runInstallerReconciliation();
runFailedInstall({ withPreviousRelease: false });
runFailedInstall({ withPreviousRelease: true });
runDependencyFailureCleanup();

console.log('OK: alpha.2 staging hardver- és hálózati izoláció');
console.log('OK: firmware runtime könyvtár szerződés');
console.log('OK: sikertelen első staging telepítés leállítása és takarítása');
console.log('OK: korábbi staging release visszaállítása');
console.log('OK: readiness JSON diagnosztika megőrzése');
console.log('OK: aktiválás előtti hibás candidate takarítása');
