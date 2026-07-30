'use strict';

const {
  LedServiceError,
  LedValidationError
} = require('../../led/led-error');

const {
  PERMISSIONS
} = require('../../security/roles');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  createPermissionMiddleware
} = require('./authorize');

const {
  requireApiV2Auth
} = require('./auth');

const {
  mapArduinoClientError
} = require('./arduino-error-mapper');

const {
  HttpError
} = require('./http-error');

const {
  sendSuccess
} = require('./http-response');

const {
  asyncRoute
} = require('./routes');

function mapLedError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    error instanceof
    LedValidationError
  ) {
    return HttpError.badRequest(
      error.code,
      error.message,
      error.details
    );
  }

  if (
    error instanceof
    LedServiceError
  ) {
    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      error.details,
      {
        cause: error
      }
    );
  }

  return mapArduinoClientError(
    error
  );
}

function createLedHandlers({
  runtimeProvider = getRuntimeContext
} = {}) {
  return {
    list: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const status =
            await runtime.ledService
              .getAllStatus();

          return sendSuccess(
            req,
            res,
            status
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    ),

    get: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const status =
            await runtime.ledService
              .getStripStatus(
                req.params.id
              );

          return sendSuccess(
            req,
            res,
            status
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    ),

    update: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const result =
            await runtime.ledService
              .updateStrip(
                req.params.id,
                req.body
              );

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    ),

    allOn: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const result =
            await runtime.ledService
              .setAllEnabled(true);

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    ),

    allOff: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const result =
            await runtime.ledService
              .setAllEnabled(false);

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    ),

    reset: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const result =
            await runtime.ledService
              .reset();

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapLedError(error);
        }
      }
    )
  };
}

function installLedRoutes(app) {
  const handlers =
    createLedHandlers();

  const readPermission =
    createPermissionMiddleware(
      PERMISSIONS.LED_READ
    );

  const writePermission =
    createPermissionMiddleware(
      PERMISSIONS.LED_WRITE
    );

  const adminPermission =
    createPermissionMiddleware(
      PERMISSIONS.LED_ADMIN
    );

  app.get(
    '/api/v2/leds',
    requireApiV2Auth,
    readPermission,
    handlers.list
  );

  app.get(
    '/api/v2/leds/:id',
    requireApiV2Auth,
    readPermission,
    handlers.get
  );

  app.put(
    '/api/v2/leds/:id',
    requireApiV2Auth,
    writePermission,
    handlers.update
  );

  app.post(
    '/api/v2/leds/actions/all-on',
    requireApiV2Auth,
    writePermission,
    handlers.allOn
  );

  app.post(
    '/api/v2/leds/actions/all-off',
    requireApiV2Auth,
    writePermission,
    handlers.allOff
  );

  app.post(
    '/api/v2/leds/actions/reset',
    requireApiV2Auth,
    adminPermission,
    handlers.reset
  );
}

module.exports = {
  createLedHandlers,
  installLedRoutes,
  mapLedError
};
