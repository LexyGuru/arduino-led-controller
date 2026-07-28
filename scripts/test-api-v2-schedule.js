'use strict';

const assert = require('assert');

const {
  createScheduleHandlers,
  mapScheduleError
} = require(
  '../server/api/v2/schedule-routes'
);

const {
  createPermissionMiddleware
} = require(
  '../server/api/v2/authorize'
);

const {
  ScheduleValidationError
} = require(
  '../server/schedule/schedule-error'
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

function createRequest(
  overrides = {}
) {
  return {
    method: 'GET',
    originalUrl:
      '/api/v2/schedules',
    params: {},
    body: {},
    apiV2: {
      requestId:
        'schedule-route-test-request-0001',
      startedAt:
        Date.now()
    },
    ...overrides
  };
}

async function invoke(
  handler,
  req
) {
  const res =
    createResponse();

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
    scheduleService: {
      async getOverview() {
        calls.push('overview');
        return {
          status: {
            count: 1
          }
        };
      },
      async getStatus() {
        calls.push('status');
        return {
          arduino: {
            count: 1
          }
        };
      },
      async listFiles() {
        calls.push('files');
        return {
          arduino: {
            files: []
          }
        };
      },
      async getDebug() {
        calls.push('debug');
        return {
          arduino: {}
        };
      },
      async getDay(day) {
        calls.push(
          `day:${day}`
        );
        return {
          day:
            Number(day)
        };
      },
      async getFile(filename) {
        calls.push(
          `file:${filename}`
        );
        return {
          filename
        };
      },
      async reload() {
        calls.push('reload');
        return {
          success: true
        };
      },
      async generate() {
        calls.push('generate');
        return {
          success: true
        };
      },
      async clear() {
        calls.push('clear');
        return {
          success: true
        };
      },
      async test(time) {
        calls.push(
          `test:${time}`
        );
        return {
          time
        };
      },
      async sync(schedules) {
        calls.push(
          `sync:${schedules.length}`
        );
        return {
          count:
            schedules.length
        };
      }
    }
  };

  const handlers =
    createScheduleHandlers({
      runtimeProvider: () =>
        runtime
    });

  const overview =
    await invoke(
      handlers.overview,
      createRequest()
    );

  assert.strictEqual(
    overview.body.success,
    true
  );

  const day =
    await invoke(
      handlers.day,
      createRequest({
        params: {
          day: '4'
        }
      })
    );

  assert.strictEqual(
    day.body.data.day,
    4
  );

  const sync =
    await invoke(
      handlers.sync,
      createRequest({
        method: 'POST',
        body: {
          schedules: [
            {
              day: 1
            },
            {
              day: 2
            }
          ]
        }
      })
    );

  assert.strictEqual(
    sync.body.data.count,
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

  const admin =
    createPrincipal({
      role: 'admin'
    });

  let viewerWriteNext = false;

  const viewerWriteResponse =
    createResponse();

  createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_WRITE
  )(
    createRequest({
      apiPrincipal:
        viewer
    }),
    viewerWriteResponse,
    () => {
      viewerWriteNext = true;
    }
  );

  assert.strictEqual(
    viewerWriteNext,
    false
  );

  assert.strictEqual(
    viewerWriteResponse.statusCode,
    403
  );

  let operatorWriteNext = false;

  createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_WRITE
  )(
    createRequest({
      apiPrincipal:
        operator
    }),
    createResponse(),
    () => {
      operatorWriteNext = true;
    }
  );

  assert.strictEqual(
    operatorWriteNext,
    true
  );

  let operatorAdminNext = false;

  createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_ADMIN
  )(
    createRequest({
      apiPrincipal:
        operator
    }),
    createResponse(),
    () => {
      operatorAdminNext = true;
    }
  );

  assert.strictEqual(
    operatorAdminNext,
    false
  );

  let adminNext = false;

  createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_ADMIN
  )(
    createRequest({
      apiPrincipal:
        admin
    }),
    createResponse(),
    () => {
      adminNext = true;
    }
  );

  assert.strictEqual(
    adminNext,
    true
  );

  const mapped =
    mapScheduleError(
      new ScheduleValidationError(
        'INVALID_SCHEDULE_TEST',
        'Teszt schedule hiba.'
      )
    );

  assert.strictEqual(
    mapped.statusCode,
    400
  );

  assert.strictEqual(
    mapped.code,
    'INVALID_SCHEDULE_TEST'
  );

  assert.deepStrictEqual(
    calls,
    [
      'overview',
      'day:4',
      'sync:2'
    ]
  );

  console.log(
    'OK: API v2 schedule route kezelők'
  );
  console.log(
    'OK: viewer/operator/admin schedule jogosultságok'
  );
  console.log(
    'OK: schedule validációs hibák HTTP-leképezése'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
