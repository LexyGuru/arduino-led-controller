'use strict';

const assert = require('assert');

const {
  createApiV2AuthMiddleware
} = require(
  '../server/api/v2/auth'
);

const {
  mapFirmwareError
} = require(
  '../server/api/v2/firmware-routes'
);

const {
  mapLocalScheduleError
} = require(
  '../server/api/v2/local-schedule-routes'
);

const {
  FirmwareServiceError
} = require(
  '../server/firmware/firmware-error'
);

const {
  ScheduleValidationError
} = require(
  '../server/schedule/schedule-error'
);

const {
  ApiTokenStore
} = require(
  '../server/security/api-token-store'
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
        this.headers[name] =
          value;
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

function createRequest(token) {
  return {
    headers: {
      authorization:
        token
          ? `Bearer ${token}`
          : ''
    },
    get(name) {
      return this.headers[
        String(name)
          .toLowerCase()
      ];
    },
    apiV2: {
      requestId:
        'extended-api-test-request-0001',
      startedAt:
        Date.now()
    }
  };
}

async function main() {
  const adminToken =
    'admin-token-1234567890-abcdefghijkl';

  const tokenStore =
    new ApiTokenStore({
      entries: [
        {
          id: 'desktop',
          token:
            adminToken,
          role: 'admin'
        }
      ]
    });

  const middleware =
    createApiV2AuthMiddleware({
      runtimeProvider: () => ({
        apiTokenStore: tokenStore,
        config: {
          apiV2: {}
        }
      })
    });

  const request =
    createRequest(
      adminToken
    );

  let nextCalled = false;

  await middleware(
    request,
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
    request.apiPrincipal.subject,
    'desktop'
  );

  const unauthorized =
    createResponse();

  await middleware(
    createRequest(
      'wrong-token'
    ),
    unauthorized,
    () => {}
  );

  assert.strictEqual(
    unauthorized.statusCode,
    401
  );

  const firmware =
    mapFirmwareError(
      FirmwareServiceError
        .busy('uploading')
    );

  assert.strictEqual(
    firmware.statusCode,
    409
  );

  assert.strictEqual(
    firmware.code,
    'FIRMWARE_UPDATE_BUSY'
  );

  const schedule =
    mapLocalScheduleError(
      new ScheduleValidationError(
        'INVALID_LOCAL_SCHEDULE',
        'Teszt schedule hiba.'
      )
    );

  assert.strictEqual(
    schedule.statusCode,
    400
  );

  console.log(
    'OK: többtokenes API v2 middleware'
  );
  console.log(
    'OK: API v2 firmware hibaleképezés'
  );
  console.log(
    'OK: API v2 helyi schedule hibaleképezés'
  );
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
