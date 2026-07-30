'use strict';

const {
  ScheduleServiceError,
  ScheduleValidationError
} = require('../../schedule/schedule-error');

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

function mapScheduleError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    error instanceof
    ScheduleValidationError
  ) {
    return HttpError.badRequest(
      error.code,
      error.message,
      error.details
    );
  }

  if (
    error instanceof
    ScheduleServiceError
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

function createScheduleHandlers({
  runtimeProvider = getRuntimeContext
} = {}) {
  function invoke(method) {
    return asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        try {
          const data =
            await method(
              runtime.scheduleService,
              req
            );

          return sendSuccess(
            req,
            res,
            data
          );
        } catch (error) {
          throw mapScheduleError(
            error
          );
        }
      }
    );
  }

  return {
    overview: invoke(
      (service) =>
        service.getOverview()
    ),

    status: invoke(
      (service) =>
        service.getStatus()
    ),

    files: invoke(
      (service) =>
        service.listFiles()
    ),

    debug: invoke(
      (service) =>
        service.getDebug()
    ),

    day: invoke(
      (service, req) =>
        service.getDay(
          req.params.day
        )
    ),

    file: invoke(
      (service, req) =>
        service.getFile(
          req.params.filename
        )
    ),

    reload: invoke(
      (service) =>
        service.reload()
    ),

    generate: invoke(
      (service) =>
        service.generate()
    ),

    clear: invoke(
      (service) =>
        service.clear()
    ),

    test: invoke(
      (service, req) =>
        service.test(
          req.body?.time
        )
    ),

    sync: invoke(
      (service, req) =>
        service.sync(
          Array.isArray(req.body)
            ? req.body
            : req.body?.schedules
        )
    )
  };
}

function installScheduleRoutes(app) {
  const handlers =
    createScheduleHandlers();

  const readPermission =
    createPermissionMiddleware(
      PERMISSIONS.SCHEDULE_READ
    );

  const writePermission =
    createPermissionMiddleware(
      PERMISSIONS.SCHEDULE_WRITE
    );

  const adminPermission =
    createPermissionMiddleware(
      PERMISSIONS.SCHEDULE_ADMIN
    );

  app.get(
    '/api/v2/schedules',
    requireApiV2Auth,
    readPermission,
    handlers.overview
  );

  app.get(
    '/api/v2/schedules/status',
    requireApiV2Auth,
    readPermission,
    handlers.status
  );

  app.get(
    '/api/v2/schedules/files',
    requireApiV2Auth,
    readPermission,
    handlers.files
  );

  app.get(
    '/api/v2/schedules/debug',
    requireApiV2Auth,
    adminPermission,
    handlers.debug
  );

  app.get(
    '/api/v2/schedules/days/:day',
    requireApiV2Auth,
    readPermission,
    handlers.day
  );

  app.get(
    '/api/v2/schedules/files/:filename',
    requireApiV2Auth,
    readPermission,
    handlers.file
  );

  app.post(
    '/api/v2/schedules/actions/reload',
    requireApiV2Auth,
    writePermission,
    handlers.reload
  );

  app.post(
    '/api/v2/schedules/actions/generate',
    requireApiV2Auth,
    writePermission,
    handlers.generate
  );

  app.post(
    '/api/v2/schedules/actions/test',
    requireApiV2Auth,
    writePermission,
    handlers.test
  );

  app.post(
    '/api/v2/schedules/actions/sync',
    requireApiV2Auth,
    writePermission,
    handlers.sync
  );

  app.delete(
    '/api/v2/schedules',
    requireApiV2Auth,
    adminPermission,
    handlers.clear
  );
}

module.exports = {
  createScheduleHandlers,
  installScheduleRoutes,
  mapScheduleError
};
