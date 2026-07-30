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
  installLegacyArduinoRoutes
} = require(
  '../server/legacy/legacy-arduino-routes'
);

const {
  installLegacyFirmwareRoutes
} = require(
  '../server/legacy/legacy-firmware-routes'
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

  setRuntimeContext({
    arduinoClient: {
      async get(endpoint) {
        return {
          data: {
            endpoint,
            success: true
          },
          latencyMs: 1
        };
      }
    },
    ledService: {
      async getAllStatus() {
        return {
          raw: {
            leds: []
          }
        };
      },
      async updateStrip(id) {
        return {
          arduino: {
            success: true,
            id:
              Number(id)
          }
        };
      },
      async setAllEnabled(enabled) {
        return {
          arduino: {
            success: true,
            enabled
          }
        };
      },
      async reset() {
        return {
          arduino: {
            success: true
          }
        };
      }
    },
    scheduleService: {
      async reload() {
        return {
          arduino: {
            success: true
          }
        };
      },
      async generate() {
        return {
          arduino: {
            success: true
          }
        };
      },
      async clear() {
        return {
          arduino: {
            success: true
          }
        };
      },
      async getDay(day) {
        return {
          arduino: {
            day:
              Number(day)
          }
        };
      },
      async getFile(filename) {
        return {
          arduino: {
            filename
          }
        };
      },
      async test(time) {
        return {
          arduino: {
            time
          }
        };
      }
    },
    firmwareService: {
      async getStatus() {
        return {
          state: 'idle'
        };
      },
      startUpdate() {
        return {
          message:
            'A firmware-frissítés elindult.'
        };
      }
    },
    eventBus: {
      publish() {}
    }
  });

  const app =
    fakeApp();

  installLegacyArduinoRoutes(
    app
  );

  installLegacyFirmwareRoutes(
    app
  );

  const statusResponse =
    response();

  await app.routes[
    'GET /api/arduino/status'
  ](
    {},
    statusResponse
  );

  assert.strictEqual(
    statusResponse.body
      .endpoint,
    'api/status'
  );

  const ledResponse =
    response();

  await app.routes[
    'POST /api/arduino/led/:id'
  ](
    {
      params: {
        id: '2'
      },
      body: {
        brightness: 100
      }
    },
    ledResponse
  );

  assert.strictEqual(
    ledResponse.body.id,
    2
  );

  const firmwareResponse =
    response();

  await app.routes[
    'POST /api/firmware/update'
  ](
    {},
    firmwareResponse
  );

  assert.strictEqual(
    firmwareResponse.statusCode,
    202
  );

  assert.strictEqual(
    firmwareResponse.body
      .success,
    true
  );

  clearRuntimeContextForTests();

  console.log(
    'OK: legacy Arduino válaszformátum'
  );
  console.log(
    'OK: legacy LED adapter'
  );
  console.log(
    'OK: legacy firmware adapter'
  );
}

main().catch((error) => {
  clearRuntimeContextForTests();
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
