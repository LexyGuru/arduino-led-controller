'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createRuntimePaths,
  resolveFromRoot
} = require('../server/core/runtime-paths');

const {
  booleanFromEnvironment,
  integerInRange,
  isConfiguredSecret,
  loadRuntimeConfig,
  normalizePrivatePath,
  numberInRange
} = require('../server/core/config');

const {
  closeLogger,
  createLogger
} = require('../server/core/logger');

function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'arduino-led-core-')
  );

  try {
    const environment = {
      NODE_ENV: 'test',
      PORT: '4321',
      BIND_HOST: '127.0.0.1',
      DATA_DIR: 'runtime-data',
      CONFIG_DIR: 'runtime-config',
      SCHEDULES_DIR: 'runtime-schedules',
      FIRMWARE_DIR: 'runtime-firmware',
      AUTH_FILE: 'runtime-config/test-users.json',
      AUDIT_FILE: 'runtime-data/test-audit.jsonl',
      ARDUINO_IP: '192.0.2.10',
      ARDUINO_PORT: '8080',
      ARDUINO_API_PATH: 'private-test-path',
      ARDUINO_API_KEY:
        'core-test-secret-1234567890',
      ARDUINO_TIMEOUT_MS: '45000',
      ARDUINO_HEALTH_TIMEOUT_MS: '1500',
      API_V2_TOKEN:
        'api-v2-core-test-token-1234567890',
      API_V2_ALLOWED_ORIGIN:
        'http://localhost:3000, https://example.test',
      COOKIE_SECURE: '1',
      LOG_LEVEL: 'warn'
    };

    const paths = createRuntimePaths(
      environment,
      tempRoot
    );

    fs.mkdirSync(paths.dataDir, {
      recursive: true
    });

    fs.mkdirSync(paths.configDir, {
      recursive: true
    });

    fs.mkdirSync(paths.schedulesDir, {
      recursive: true
    });

    fs.mkdirSync(paths.firmwareDir, {
      recursive: true
    });

    fs.writeFileSync(
      paths.runtimeSettingsFile,
      JSON.stringify({
        arduinoIP: '198.51.100.25',
        arduinoPort: 9090
      }),
      'utf8'
    );

    const config = loadRuntimeConfig({
      environment,
      paths
    });

    assert.strictEqual(
      paths.projectRoot,
      path.resolve(tempRoot)
    );

    assert.strictEqual(
      paths.authFile,
      path.join(
        tempRoot,
        'runtime-config',
        'test-users.json'
      )
    );

    assert.strictEqual(
      resolveFromRoot(
        tempRoot,
        'relative/file.json'
      ),
      path.join(
        tempRoot,
        'relative',
        'file.json'
      )
    );

    assert.strictEqual(config.http.port, 4321);
    assert.strictEqual(
      config.http.bindHost,
      '127.0.0.1'
    );

    assert.strictEqual(
      config.arduino.ip,
      '198.51.100.25'
    );

    assert.strictEqual(
      config.arduino.port,
      9090
    );

    assert.strictEqual(
      config.arduino.apiPath,
      '/private-test-path'
    );

    assert.strictEqual(
      config.arduino.timeoutMs,
      45000
    );

    assert.strictEqual(
      config.arduino.healthTimeoutMs,
      1500
    );

    assert.deepStrictEqual(
      config.apiV2.allowedOrigins,
      [
        'http://localhost:3000',
        'https://example.test'
      ]
    );

    assert.strictEqual(
      config.security.cookieSecure,
      true
    );

    assert.strictEqual(
      config.logging.level,
      'warn'
    );

    assert.strictEqual(
      Object.isFrozen(config),
      true
    );

    assert.strictEqual(
      Object.isFrozen(config.arduino),
      true
    );

    assert.strictEqual(
      integerInRange('80', 1, 1, 65535),
      80
    );

    assert.strictEqual(
      integerInRange('invalid', 81, 1, 65535),
      81
    );

    assert.strictEqual(
      numberInRange('25000', 1000, 500, 10000),
      10000
    );

    assert.strictEqual(
      booleanFromEnvironment('yes'),
      true
    );

    assert.strictEqual(
      normalizePrivatePath('api/private/'),
      '/api/private'
    );

    assert.strictEqual(
      isConfiguredSecret(
        'long-enough-real-secret',
        16
      ),
      true
    );

    assert.strictEqual(
      isConfiguredSecret(
        'CHANGE_THIS_SECRET',
        8
      ),
      false
    );

    const logger = createLogger({
      serviceName: config.service.name,
      level: config.logging.level,
      dataDir: config.paths.dataDir,
      enableFileLogging: false,
      silent: true
    });

    assert.strictEqual(
      typeof logger.info,
      'function'
    );

    assert.strictEqual(
      typeof logger.error,
      'function'
    );

    logger.info('Core logger smoke test.');
    closeLogger(logger);

    console.log(
      'OK: futásidejű útvonalak'
    );
    console.log(
      'OK: egységes core konfiguráció'
    );
    console.log(
      'OK: runtime Arduino felülírás'
    );
    console.log(
      'OK: központi logger'
    );
  } finally {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true
    });
  }
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
