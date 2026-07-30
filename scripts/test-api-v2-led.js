'use strict';

const assert = require('assert');

const {
  createLedHandlers,
  mapLedError
} = require(
  '../server/api/v2/led-routes'
);

const {
  createPermissionMiddleware
} = require(
  '../server/api/v2/authorize'
);

const {
  LedValidationError
} = require(
  '../server/led/led-error'
);

const {
  PERMISSIONS,
  createPrincipal
} = require(
  '../server/security/roles'
);

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v2/leds',
    params: {},
    body: {},
    apiV2: {
      requestId:
        'led-route-test-request-0001',
      startedAt: Date.now()
    },
    ...overrides
  };
}

async function invoke(
  handler,
  req
) {
  const res = createResponse();

  await new Promise(
    (resolve, reject) => {
      handler(
        req,
        res,
        (error) =>
          error
            ? reject(error)
            : resolve()
      );

      setImmediate(resolve);
    }
  );

  return res;
}

async function main() {
  const calls = [];

  const runtime = {
    ledService: {
      async getAllStatus() {
        calls.push('list');
        return {
          leds: [
            {
              id: 1
            }
          ]
        };
      },
      async getStripStatus(id) {
        calls.push(
          `get:${id}`
        );
        return {
          led: {
            id: Number(id)
          }
        };
      },
      async updateStrip(id, body) {
        calls.push(
          `update:${id}`
        );
        return {
          id: Number(id),
          command: body
        };
      },
      async setAllEnabled(enabled) {
        calls.push(
          `all:${enabled}`
        );
        return {
          enabled
        };
      },
      async reset() {
        calls.push('reset');
        return {
          reset: true
        };
      }
    }
  };

  const handlers =
    createLedHandlers({
      runtimeProvider: () =>
        runtime
    });

  const listResponse =
    await invoke(
      handlers.list,
      createRequest()
    );

  assert.strictEqual(
    listResponse.statusCode,
    200
  );

  assert.strictEqual(
    listResponse.body.success,
    true
  );

  const updateResponse =
    await invoke(
      handlers.update,
      createRequest({
        method: 'PUT',
        params: {
          id: '2'
        },
        body: {
          enabled: true
        }
      })
    );

  assert.strictEqual(
    updateResponse.body.data.id,
    2
  );

  const viewer =
    createPrincipal({
      role: 'viewer'
    });

  const operator =
    createPrincipal({
      role: 'operator'
    });

  let viewerNext = false;

  const viewerWriteResponse =
    createResponse();

  createPermissionMiddleware(
    PERMISSIONS.LED_WRITE
  )(
    createRequest({
      apiPrincipal:
        viewer
    }),
    viewerWriteResponse,
    () => {
      viewerNext = true;
    }
  );

  assert.strictEqual(
    viewerNext,
    false
  );

  assert.strictEqual(
    viewerWriteResponse.statusCode,
    403
  );

  let operatorNext = false;

  createPermissionMiddleware(
    PERMISSIONS.LED_WRITE
  )(
    createRequest({
      apiPrincipal:
        operator
    }),
    createResponse(),
    () => {
      operatorNext = true;
    }
  );

  assert.strictEqual(
    operatorNext,
    true
  );

  const mapped =
    mapLedError(
      new LedValidationError(
        'INVALID_LED_TEST',
        'Teszt validációs hiba.'
      )
    );

  assert.strictEqual(
    mapped.statusCode,
    400
  );

  assert.strictEqual(
    mapped.code,
    'INVALID_LED_TEST'
  );

  assert.deepStrictEqual(
    calls,
    [
      'list',
      'update:2'
    ]
  );

  console.log(
    'OK: API v2 LED route kezelők'
  );
  console.log(
    'OK: viewer/operator jogosultságok'
  );
  console.log(
    'OK: LED validációs hibák HTTP-leképezése'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
