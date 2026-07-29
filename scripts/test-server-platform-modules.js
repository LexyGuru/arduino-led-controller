'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ExpressBootstrapRegistry
} = require(
  '../server/express/express-bootstrap-registry'
);

const {
  createApiV2AuthMiddleware,
  parseBearerToken,
  safeTokenEquals
} = require(
  '../server/api/v2/auth'
);

const {
  createApiV2CorsMiddleware,
  resolveAllowedOrigin
} = require(
  '../server/api/v2/cors-security'
);

const {
  collectApiV2ReadinessChecks
} = require(
  '../server/api/v2/readiness'
);

const {
  ArduinoClientError
} = require(
  '../server/arduino/arduino-error'
);

const {
  mapArduinoClientError
} = require(
  '../server/api/v2/arduino-error-mapper'
);

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    ended: false,
    set(name, value) {
      if (
        name &&
        typeof name === 'object'
      ) {
        Object.assign(
          this.headers,
          name
        );
      } else {
        this.headers[name] = value;
      }
      return this;
    },
    vary(name) {
      this.headers.Vary = name;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

async function main() {
  const registry =
    new ExpressBootstrapRegistry();

  const order = [];

  registry.register(
    'first',
    (app) => {
      app.installed.push('first');
      order.push('first');
    }
  );

  registry.register(
    'second',
    (app) => {
      app.installed.push('second');
      order.push('second');
    }
  );

  function fakeExpress() {
    return {
      installed: []
    };
  }

  fakeExpress.json = () => 'json';

  const patched =
    registry.createPatchedFactory(
      fakeExpress
    );

  const app = patched();

  assert.deepStrictEqual(
    app.installed,
    ['first', 'second']
  );

  assert.deepStrictEqual(
    order,
    ['first', 'second']
  );

  assert.strictEqual(
    patched.json(),
    'json'
  );

  assert.throws(
    () => registry.register(
      'first',
      () => {}
    ),
    /már regisztrálva/
  );

  const token =
    'server-module-test-token-1234567890abcdef';

  const authMiddleware =
    createApiV2AuthMiddleware({
      runtimeProvider: () => ({
        config: {
          apiV2: {
            token
          }
        }
      })
    });

  const authRequest = {
    headers: {
      authorization:
        `Bearer ${token}`
    },
    get(name) {
      return this.headers[
        String(name).toLowerCase()
      ];
    },
    apiV2: {
      requestId:
        'server-module-request-0001',
      startedAt: Date.now()
    }
  };

  let nextCalled = false;

  await authMiddleware(
    authRequest,
    createResponse(),
    () => {
      nextCalled = true;
    }
  );

  assert.strictEqual(
    nextCalled,
    true
  );

  assert.strictEqual(
    parseBearerToken(
      authRequest
    ),
    token
  );

  assert.strictEqual(
    safeTokenEquals(
      token,
      token
    ),
    true
  );

  assert.strictEqual(
    safeTokenEquals(
      token,
      `${token}-wrong`
    ),
    false
  );

  const unauthorizedResponse =
    createResponse();

  await authMiddleware(
    {
      ...authRequest,
      headers: {}
    },
    unauthorizedResponse,
    () => {}
  );

  assert.strictEqual(
    unauthorizedResponse.statusCode,
    401
  );

  assert.strictEqual(
    unauthorizedResponse
      .body.error.code,
    'UNAUTHORIZED'
  );

  const corsMiddleware =
    createApiV2CorsMiddleware({
      runtimeProvider: () => ({
        config: {
          apiV2: {
            allowedOrigins: [
              'https://example.test'
            ]
          }
        }
      })
    });

  const corsResponse =
    createResponse();

  let corsNextCalled = false;

  corsMiddleware(
    {
      headers: {
        origin:
          'https://example.test'
      },
      get(name) {
        return this.headers[
          String(name).toLowerCase()
        ];
      }
    },
    corsResponse,
    () => {
      corsNextCalled = true;
    }
  );

  assert.strictEqual(
    corsNextCalled,
    true
  );

  assert.strictEqual(
    corsResponse.headers[
      'Access-Control-Allow-Origin'
    ],
    'https://example.test'
  );

  assert.strictEqual(
    resolveAllowedOrigin(
      'https://blocked.test',
      ['https://example.test']
    ),
    ''
  );

  const tempRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'api-v2-modules-'
    )
  );

  try {
    const paths = {
      dataDir:
        path.join(tempRoot, 'data'),
      configDir:
        path.join(tempRoot, 'config'),
      schedulesDir:
        path.join(tempRoot, 'schedules'),
      firmwareDir:
        path.join(tempRoot, 'firmware')
    };

    for (
      const directory
      of Object.values(paths)
    ) {
      fs.mkdirSync(
        directory,
        {
          recursive: true
        }
      );
    }

    const checks =
      await collectApiV2ReadinessChecks({
        config: {
          apiV2: {
            token
          }
        },
        paths,
        arduinoClient: {
          configurationChecks() {
            return [
              {
                name:
                  'arduinoTarget',
                ok: true
              }
            ];
          }
        }
      });

    assert.strictEqual(
      checks.every(
        (check) => check.ok
      ),
      true
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive: true,
        force: true
      }
    );
  }

  const mapped =
    mapArduinoClientError(
      ArduinoClientError.timeout()
    );

  assert.strictEqual(
    mapped.code,
    'ARDUINO_TIMEOUT'
  );

  assert.strictEqual(
    mapped.statusCode,
    504
  );

  console.log(
    'OK: közös Express bootstrap-regiszter'
  );
  console.log(
    'OK: külön API v2 Bearer middleware'
  );
  console.log(
    'OK: külön API v2 CORS/security middleware'
  );
  console.log(
    'OK: külön API v2 readiness modul'
  );
  console.log(
    'OK: külön Arduino HTTP-hiba leképezés'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
