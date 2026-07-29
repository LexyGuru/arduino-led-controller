'use strict';

const {
  RuntimeSettingsError
} = require(
  '../../core/runtime-settings-service'
);

const {
  getRuntimeContext
} = require(
  '../../core/runtime-context'
);

const {
  PERMISSIONS
} = require(
  '../../security/roles'
);

const {
  createPermissionMiddleware
} = require('./authorize');

const {
  requireApiV2Auth
} = require('./auth');

const {
  HttpError
} = require('./http-error');

const {
  sendSuccess
} = require('./http-response');

const {
  asyncRoute
} = require('./routes');

function mapRuntimeSettingsError(
  error
) {
  if (
    error instanceof
    RuntimeSettingsError
  ) {
    return HttpError.badRequest(
      error.code,
      error.message,
      error.details
    );
  }

  return HttpError.internal(
    'RUNTIME_SETTINGS_ERROR',
    'A futásidejű beállítás mentése nem sikerült.',
    null,
    {
      cause: error
    }
  );
}

function installSettingsRoutes(
  app
) {
  const read =
    createPermissionMiddleware(
      PERMISSIONS
        .SETTINGS_READ
    );

  const write =
    createPermissionMiddleware(
      PERMISSIONS
        .SETTINGS_WRITE
    );

  app.get(
    '/api/v2/settings/arduino',
    requireApiV2Auth,
    read,
    (req, res) => {
      const runtime =
        getRuntimeContext();

      return sendSuccess(
        req,
        res,
        runtime
          .runtimeSettingsService
          .getArduinoTarget()
      );
    }
  );

  app.put(
    '/api/v2/settings/arduino',
    requireApiV2Auth,
    write,
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        try {
          return sendSuccess(
            req,
            res,
            await runtime
              .runtimeSettingsService
              .updateArduinoTarget(
                req.body,
                {
                  principal:
                    req.apiPrincipal
                }
              )
          );
        } catch (error) {
          throw mapRuntimeSettingsError(
            error
          );
        }
      }
    )
  );
}

module.exports = {
  installSettingsRoutes,
  mapRuntimeSettingsError
};
