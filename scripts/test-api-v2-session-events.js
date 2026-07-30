'use strict';

const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const {
  spawn
} = require('child_process');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const USERNAME = 'admin';
const PASSWORD =
  'session-test-password-12345';

function reservePort() {
  return new Promise(
    (resolve, reject) => {
      const server =
        net.createServer();

      server.unref();
      server.once(
        'error',
        reject
      );

      server.listen(
        0,
        '127.0.0.1',
        () => {
          const port =
            server.address().port;

          server.close(
            (error) =>
              error
                ? reject(error)
                : resolve(port)
          );
        }
      );
    }
  );
}

async function waitForJson(
  url,
  child,
  options = {},
  timeoutMs = 15000
) {
  const deadline =
    Date.now() +
    timeoutMs;

  let lastError;

  while (
    Date.now() <
    deadline
  ) {
    if (
      child.exitCode !== null
    ) {
      throw new Error(
        `A tesztszerver leállt: ${child.exitCode}`
      );
    }

    try {
      const response =
        await fetch(
          url,
          options
        );

      const body =
        await response.json();

      return {
        response,
        body
      };
    } catch (error) {
      lastError = error;

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            150
          )
      );
    }
  }

  throw lastError ||
    new Error(
      `Időtúllépés: ${url}`
    );
}

async function stopChild(child) {
  if (
    !child ||
    child.exitCode !== null
  ) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise(
      (resolve) =>
        child.once(
          'exit',
          resolve
        )
    ),
    new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          3000
        )
    )
  ]);

  if (
    child.exitCode === null
  ) {
    child.kill('SIGKILL');
  }
}

function createUserFile(
  filePath
) {
  const salt =
    crypto
      .randomBytes(16)
      .toString('hex');

  const passwordHash =
    crypto
      .scryptSync(
        PASSWORD,
        salt,
        64
      )
      .toString('hex');

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      sessionSecret:
        'endpoint-session-secret-1234567890abcdef',
      users: [
        {
          username:
            USERNAME,
          displayName:
            'Administrator',
          role:
            'admin',
          salt,
          passwordHash,
          sessionVersion:
            1,
          enabled:
            true
        }
      ]
    }),
    'utf8'
  );
}

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'api-v2-session-events-'
      )
    );

  const dataDir =
    path.join(
      tempRoot,
      'data'
    );

  const configDir =
    path.join(
      tempRoot,
      'config'
    );

  const schedulesDir =
    path.join(
      tempRoot,
      'schedules'
    );

  const firmwareDir =
    path.join(
      dataDir,
      'firmware'
    );

  for (
    const directory
    of [
      dataDir,
      configDir,
      schedulesDir,
      firmwareDir
    ]
  ) {
    fs.mkdirSync(
      directory,
      {
        recursive: true
      }
    );
  }

  const authFile =
    path.join(
      configDir,
      'users.json'
    );

  createUserFile(
    authFile
  );

  const port =
    await reservePort();

  const arduinoPort =
    await reservePort();

  let child;
  let output = '';

  try {
    child = spawn(
      process.execPath,
      [
        'server2_final.js'
      ],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOG_LEVEL: 'error',
          BIND_HOST:
            '127.0.0.1',
          PORT:
            String(port),
          DATA_DIR:
            dataDir,
          CONFIG_DIR:
            configDir,
          SCHEDULES_DIR:
            schedulesDir,
          FIRMWARE_DIR:
            firmwareDir,
          AUTH_FILE:
            authFile,
          ARDUINO_IP:
            '127.0.0.1',
          ARDUINO_PORT:
            String(
              arduinoPort
            ),
          ARDUINO_API_PATH:
            '/session-events-test-private',
          ARDUINO_API_KEY:
            'session-events-arduino-secret-123456',
          API_V2_TOKEN:
            'session-events-api-token-1234567890abcdef',
          API_V2_ROLE:
            'admin',
          ARDUINO_HEALTH_TIMEOUT_MS:
            '500',
          COOKIE_SECURE:
            '0',
          LOCAL_SCHEDULE_RUNNER_MODE:
            'manual'
        },
        stdio: [
          'ignore',
          'pipe',
          'pipe'
        ]
      }
    );

    child.stdout.on(
      'data',
      (chunk) => {
        output +=
          chunk.toString();
      }
    );

    child.stderr.on(
      'data',
      (chunk) => {
        output +=
          chunk.toString();
      }
    );

    const baseUrl =
      `http://127.0.0.1:${port}`;

    await waitForJson(
      `${baseUrl}/health/live`,
      child
    );

    const login =
      await waitForJson(
        `${baseUrl}/api/v2/auth/login`,
        child,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body:
            JSON.stringify({
              username:
                USERNAME,
              password:
                PASSWORD
            })
        }
      );

    if (
      login.response.status !==
        200 ||
      login.body.success !== true
    ) {
      throw new Error(
        `Login hiba: ${login.response.status} ${JSON.stringify(login.body)}`
      );
    }

    const setCookie =
      login.response.headers
        .get('set-cookie');

    const cookie =
      String(setCookie || '')
        .split(';')[0];

    if (
      !cookie.startsWith(
        'led_session='
      )
    ) {
      throw new Error(
        'A login nem adott led_session cookie-t.'
      );
    }

    const status =
      await waitForJson(
        `${baseUrl}/api/v2/system/status`,
        child,
        {
          headers: {
            Cookie: cookie
          }
        }
      );

    if (
      status.response.status !==
        200 ||
      status.body.data
        ?.principal?.type !==
        'user-session'
    ) {
      throw new Error(
        `Session auth hiba: ${status.response.status} ${JSON.stringify(status.body)}`
      );
    }

    const csrf =
      await waitForJson(
        `${baseUrl}/api/v2/auth/csrf`,
        child,
        {
          headers: {
            Cookie: cookie
          }
        }
      );

    const csrfToken =
      csrf.body.data
        ?.token;

    if (
      csrf.response.status !==
        200 ||
      typeof csrfToken !==
        'string' ||
      csrfToken.length < 20
    ) {
      throw new Error(
        `CSRF token hiba: ${csrf.response.status} ${JSON.stringify(csrf.body)}`
      );
    }

    const events =
      await waitForJson(
        `${baseUrl}/api/v2/events/recent?topic=auth.login&limit=10`,
        child,
        {
          headers: {
            Cookie: cookie
          }
        }
      );

    if (
      events.response.status !==
        200 ||
      !Array.isArray(
        events.body.data
          ?.events
      ) ||
      events.body.data
        .events.length < 1
    ) {
      throw new Error(
        `Esemény API hiba: ${events.response.status} ${JSON.stringify(events.body)}`
      );
    }

    const logout =
      await waitForJson(
        `${baseUrl}/api/v2/auth/logout`,
        child,
        {
          method: 'POST',
          headers: {
            Cookie: cookie,
            'X-CSRF-Token':
              csrfToken
          }
        }
      );

    if (
      logout.response.status !==
        200 ||
      logout.body.success !== true
    ) {
      throw new Error(
        `Logout hiba: ${logout.response.status} ${JSON.stringify(logout.body)}`
      );
    }

    const invalid =
      await waitForJson(
        `${baseUrl}/api/v2/auth/login`,
        child,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body:
            JSON.stringify({
              username:
                USERNAME,
              password:
                'incorrect-password'
            })
        }
      );

    if (
      invalid.response.status !==
        401 ||
      invalid.body.error?.code !==
        'INVALID_CREDENTIALS'
    ) {
      throw new Error(
        `Hibás login válasz: ${invalid.response.status} ${JSON.stringify(invalid.body)}`
      );
    }

    console.log(
      'OK: API v2 JSON body parser'
    );
    console.log(
      'OK: API v2 session login és cookie auth'
    );
    console.log(
      'OK: API v2 eseménytörténet végpont'
    );
    console.log(
      'OK: API v2 session CSRF token'
    );
    console.log(
      'OK: API v2 session logout és hibás login'
    );
  } catch (error) {
    if (
      output.trim()
    ) {
      console.error(
        `\nTesztszerver kimenete:\n${output.trim()}`
      );
    }

    throw error;
  } finally {
    await stopChild(
      child
    );

    fs.rmSync(
      tempRoot,
      {
        recursive: true,
        force: true
      }
    );
  }
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
