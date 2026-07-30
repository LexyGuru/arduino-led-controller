'use strict';

const assert =
  require('assert');

const {
  clearRuntimeContextForTests,
  setRuntimeContext
} = require(
  '../server/core/runtime-context'
);

const {
  installLegacyAuthRoutes
} = require(
  '../server/legacy/legacy-auth-routes'
);

const {
  installLegacyLocalScheduleRoutes
} = require(
  '../server/legacy/legacy-local-schedule-routes'
);

function fakeApp() {
  const routes = {};

  return {
    routes,
    get(path, handler) {
      routes[
        `GET ${path}`
      ] = handler;
    },
    post(path, handler) {
      routes[
        `POST ${path}`
      ] = handler;
    },
    delete(path, handler) {
      routes[
        `DELETE ${path}`
      ] = handler;
    }
  };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    set(values) {
      Object.assign(
        this.headers,
        values
      );
      return this;
    },
    status(code) {
      this.statusCode =
        code;
      return this;
    },
    json(body) {
      this.body =
        body;
      return this;
    }
  };
}

async function main() {
  clearRuntimeContextForTests();

  const schedules = [
    {
      id: 'schedule-1',
      day: 1,
      time: '19:30',
      leds: []
    }
  ];

  setRuntimeContext({
    sessionService: {
      async status() {
        return {
          authenticated: true,
          user: {
            username: 'admin',
            displayName:
              'Administrator',
            role: 'admin'
          },
          setupNeeded: false,
          cookieSecure: true
        };
      },
      async login() {
        return {
          user: {
            username: 'admin',
            displayName:
              'Administrator',
            role: 'admin'
          },
          principal: {
            subject: 'admin',
            role: 'admin'
          }
        };
      },
      async sessionUser() {
        return {
          username: 'admin',
          displayName:
            'Administrator',
          role: 'admin'
        };
      },
      logout() {}
    },
    auditLog: {
      async record() {}
    },
    localScheduleService: {
      async list() {
        return schedules;
      },
      async export() {
        return {
          format:
            'arduino-led-controller-schedules',
          version: 1,
          schedules
        };
      },
      async create() {
        return schedules;
      },
      async import() {
        return {
          count: 1,
          backupFile:
            'backup.json'
        };
      },
      async remove() {
        return {
          removed: true
        };
      },
      async syncArduino() {
        return {
          arduino: {
            success: true
          }
        };
      }
    }
  });

  const app =
    fakeApp();

  installLegacyAuthRoutes(
    app
  );
  installLegacyLocalScheduleRoutes(
    app
  );

  const authResponse =
    response();

  await app.routes[
    'GET /api/auth/status'
  ](
    {},
    authResponse
  );

  assert.strictEqual(
    authResponse.body
      .authenticated,
    true
  );

  assert.deepStrictEqual(
    authResponse.body.user,
    {
      username: 'admin',
      role: 'admin',
      displayName:
        'Administrator'
    }
  );

  const listResponse =
    response();

  await app.routes[
    'GET /api/local-schedules'
  ](
    {},
    listResponse
  );

  assert.strictEqual(
    listResponse.body
      .schedules.length,
    1
  );

  const createResponse =
    response();

  await app.routes[
    'POST /api/local-schedules'
  ](
    {
      body: {}
    },
    createResponse
  );

  assert.strictEqual(
    createResponse.statusCode,
    201
  );

  const exportResponse =
    response();

  await app.routes[
    'GET /api/local-schedules/export'
  ](
    {},
    exportResponse
  );

  assert.match(
    exportResponse.headers[
      'Content-Disposition'
    ],
    /weekly-led-schedules/
  );

  clearRuntimeContextForTests();

  console.log(
    'OK: legacy auth status és login kompatibilitás'
  );
  console.log(
    'OK: legacy helyi schedule válaszformátum'
  );
  console.log(
    'OK: legacy schedule export fejléc'
  );
}

main().catch((error) => {
  clearRuntimeContextForTests();
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
