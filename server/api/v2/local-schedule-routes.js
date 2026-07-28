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

function mapLocalScheduleError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof ScheduleValidationError) {
    return HttpError.badRequest(
      error.code,
      error.message,
      error.details
    );
  }

  if (error instanceof ScheduleServiceError) {
    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      error.details,
      { cause: error }
    );
  }

  return mapArduinoClientError(error);
}

function invoke(method) {
  return asyncRoute(async (req, res) => {
    const runtime = getRuntimeContext();

    try {
      const result = await method(
        runtime.localScheduleService,
        req
      );

      return sendSuccess(req, res, result);
    } catch (error) {
      throw mapLocalScheduleError(error);
    }
  });
}

function installLocalScheduleRoutes(app) {
  const read = createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_READ
  );

  const write = createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_WRITE
  );

  const admin = createPermissionMiddleware(
    PERMISSIONS.SCHEDULE_ADMIN
  );

  app.get(
    '/api/v2/local-schedules',
    requireApiV2Auth,
    read,
    invoke((service) => service.list())
  );

  app.get(
    '/api/v2/local-schedules/export',
    requireApiV2Auth,
    read,
    invoke((service) => service.export())
  );

  app.post(
    '/api/v2/local-schedules',
    requireApiV2Auth,
    write,
    invoke((service, req) => service.create(req.body))
  );

  app.post(
    '/api/v2/local-schedules/import',
    requireApiV2Auth,
    admin,
    invoke((service, req) => service.import(req.body))
  );

  app.delete(
    '/api/v2/local-schedules/:id',
    requireApiV2Auth,
    write,
    invoke((service, req) => service.remove(req.params.id))
  );

  app.post(
    '/api/v2/local-schedules/actions/sync-arduino',
    requireApiV2Auth,
    write,
    invoke((service) => service.syncArduino())
  );

  app.get(
    '/api/v2/local-schedules/runner',
    requireApiV2Auth,
    read,
    invoke((service) => service.runnerStatus())
  );

  app.post(
    '/api/v2/local-schedules/runner/actions/tick',
    requireApiV2Auth,
    write,
    invoke((service, req) => service.tick({
      force: req.body?.force === true
    }))
  );
}

module.exports = {
  installLocalScheduleRoutes,
  mapLocalScheduleError
};
