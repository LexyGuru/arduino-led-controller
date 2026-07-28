'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const API_TOKEN =
  'api-v2-test-token-1234567890abcdef';
const TEST_ORIGIN = 'https://example.test';

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;

      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForJson(
  url,
  child,
  options = {},
  timeoutMs = 15000
) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Az API v2 tesztszerver idő előtt leállt: ` +
        `${child.exitCode}`
      );
    }

    try {
      const response = await fetch(
        url,
        options
      );

      const body = await response.json();

      return {
        response,
        body
      };
    } catch (error) {
      lastError = error;

      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
    }
  }

  throw lastError ||
    new Error(`Időtúllépés: ${url}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => {
      child.once('exit', resolve);
    }),
    new Promise((resolve) => {
      setTimeout(resolve, 3000);
    })
  ]);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

function assertMeta(body, label) {
  if (
    !body?.meta ||
    body.meta.apiVersion !== '2' ||
    typeof body.meta.requestId !== 'string' ||
    typeof body.meta.timestamp !== 'string' ||
    !Number.isInteger(body.meta.durationMs)
  ) {
    throw new Error(
      `${label}: hibás meta objektum: ` +
      JSON.stringify(body)
    );
  }
}

function assertSuccess(
  response,
  body,
  label,
  expectedStatus = 200
) {
  if (
    response.status !== expectedStatus ||
    body?.success !== true ||
    !Object.prototype.hasOwnProperty.call(
      body,
      'data'
    )
  ) {
    throw new Error(
      `${label}: hibás sikeres válasz: ` +
      `${response.status} ` +
      JSON.stringify(body)
    );
  }

  assertMeta(body, label);
}

function assertError(
  response,
  body,
  label,
  expectedStatus,
  expectedCode
) {
  if (
    response.status !== expectedStatus ||
    body?.success !== false ||
    body?.error?.code !== expectedCode
  ) {
    throw new Error(
      `${label}: hibás hibaválasz: ` +
      `${response.status} ` +
      JSON.stringify(body)
    );
  }

  assertMeta(body, label);
}

async function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'arduino-led-api-v2-'
    )
  );

  const dataDir = path.join(
    tempRoot,
    'data'
  );
  const configDir = path.join(
    tempRoot,
    'config'
  );
  const schedulesDir = path.join(
    tempRoot,
    'schedules'
  );
  const firmwareDir = path.join(
    dataDir,
    'firmware'
  );

  for (const directory of [
    dataDir,
    configDir,
    schedulesDir,
    firmwareDir
  ]) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }

  const port = await reservePort();
  const unusedArduinoPort =
    await reservePort();

  let output = '';
  let child;

  try {
    child = spawn(
      process.execPath,
      ['server2_final.js'],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOG_LEVEL: 'error',
          BIND_HOST: '127.0.0.1',
          PORT: String(port),
          DATA_DIR: dataDir,
          CONFIG_DIR: configDir,
          SCHEDULES_DIR: schedulesDir,
          FIRMWARE_DIR: firmwareDir,
          AUTH_FILE: path.join(
            configDir,
            'users.json'
          ),
          AUDIT_FILE: path.join(
            dataDir,
            'audit-log.jsonl'
          ),
          API_V2_TOKEN: API_TOKEN,
          API_V2_ALLOWED_ORIGIN:
            TEST_ORIGIN,
          ARDUINO_IP: '127.0.0.1',
          ARDUINO_PORT: String(
            unusedArduinoPort
          ),
          ARDUINO_API_PATH:
            '/api-v2-test-private-path',
          ARDUINO_API_KEY:
            'api-v2-arduino-secret-1234567890',
          ARDUINO_HEALTH_TIMEOUT_MS:
            '500',
          ARDUINO_RETRY_COUNT: '0',
          COOKIE_SECURE: '0'
        },
        stdio: [
          'ignore',
          'pipe',
          'pipe'
        ]
      }
    );

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const discovery = await waitForJson(
      `${baseUrl}/api/v2`,
      child,
      {
        headers: {
          Origin: TEST_ORIGIN,
          'X-Request-ID':
            'api-v2-test-request-0001'
        }
      }
    );

    assertSuccess(
      discovery.response,
      discovery.body,
      'GET /api/v2'
    );

    if (
      discovery.response.headers.get(
        'x-request-id'
      ) !== 'api-v2-test-request-0001'
    ) {
      throw new Error(
        'A szerver nem adta vissza a kliens request ID-ját.'
      );
    }

    if (
      discovery.response.headers.get(
        'access-control-allow-origin'
      ) !== TEST_ORIGIN
    ) {
      throw new Error(
        'Az API v2 CORS fejléc hibás.'
      );
    }

    const healthResponse = await fetch(
      `${baseUrl}/api/v2/system/health`
    );
    const healthBody =
      await healthResponse.json();

    assertSuccess(
      healthResponse,
      healthBody,
      'GET /api/v2/system/health'
    );

    const unauthorizedResponse =
      await fetch(
        `${baseUrl}/api/v2/system/status`
      );
    const unauthorizedBody =
      await unauthorizedResponse.json();

    assertError(
      unauthorizedResponse,
      unauthorizedBody,
      'GET /api/v2/system/status hitelesítés nélkül',
      401,
      'UNAUTHORIZED'
    );

    const authenticatedHeaders = {
      Authorization: `Bearer ${API_TOKEN}`
    };

    const statusResponse = await fetch(
      `${baseUrl}/api/v2/system/status`,
      {
        headers: authenticatedHeaders
      }
    );
    const statusBody =
      await statusResponse.json();

    assertSuccess(
      statusResponse,
      statusBody,
      'GET /api/v2/system/status'
    );

    const arduinoResponse = await fetch(
      `${baseUrl}/api/v2/arduino/status`,
      {
        headers: authenticatedHeaders
      }
    );
    const arduinoBody =
      await arduinoResponse.json();

    assertError(
      arduinoResponse,
      arduinoBody,
      'GET /api/v2/arduino/status offline Arduino',
      503,
      'ARDUINO_UNREACHABLE'
    );

    const notFoundResponse = await fetch(
      `${baseUrl}/api/v2/ismeretlen`,
      {
        headers: authenticatedHeaders
      }
    );
    const notFoundBody =
      await notFoundResponse.json();

    assertError(
      notFoundResponse,
      notFoundBody,
      'Ismeretlen API v2 útvonal',
      404,
      'API_ROUTE_NOT_FOUND'
    );

    const optionsResponse = await fetch(
      `${baseUrl}/api/v2/system/status`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: TEST_ORIGIN,
          'Access-Control-Request-Method':
            'GET',
          'Access-Control-Request-Headers':
            'Authorization'
        }
      }
    );

    if (optionsResponse.status !== 204) {
      throw new Error(
        `Hibás OPTIONS válasz: ` +
        `${optionsResponse.status}`
      );
    }

    console.log(
      'OK: API v2 egységes sikeres válasz'
    );
    console.log(
      'OK: API v2 Bearer hitelesítés'
    );
    console.log(
      'OK: API v2 egységes hibaválasz'
    );
    console.log(
      'OK: API v2 Arduino offline állapot'
    );
    console.log(
      'OK: API v2 CORS és request ID'
    );
  } catch (error) {
    if (output.trim()) {
      console.error(
        '\nAPI v2 tesztszerver kimenete:\n' +
        output.trim()
      );
    }

    throw error;
  } finally {
    await stopChild(child);

    fs.rmSync(tempRoot, {
      recursive: true,
      force: true
    });
  }
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
