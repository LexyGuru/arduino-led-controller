'use strict';

const {
  FirmwareServiceError
} = require('../../firmware/firmware-error');

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
  HttpError
} = require('./http-error');

const {
  sendSuccess
} = require('./http-response');

const {
  asyncRoute
} = require('./routes');

function mapFirmwareError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof FirmwareServiceError) {
    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      error.details,
      { cause: error }
    );
  }

  return HttpError.internal(
    'FIRMWARE_SERVICE_ERROR',
    'A firmware szolgáltatás hibát jelzett.',
    null,
    { cause: error }
  );
}

function invoke(method, options = {}) {
  return asyncRoute(async (req, res) => {
    const runtime = getRuntimeContext();

    try {
      const result = await method(runtime.firmwareService, req);
      return sendSuccess(req, res, result, options);
    } catch (error) {
      throw mapFirmwareError(error);
    }
  });
}

function installFirmwareRoutes(app) {
  const read = createPermissionMiddleware(
    PERMISSIONS.FIRMWARE_READ
  );

  const update = createPermissionMiddleware(
    PERMISSIONS.FIRMWARE_UPDATE
  );

  app.get(
    '/api/v2/firmware/status',
    requireApiV2Auth,
    read,
    invoke((service) => service.getStatus())
  );

  app.post(
    '/api/v2/firmware/actions/check',
    requireApiV2Auth,
    read,
    invoke((service) => service.checkRelease())
  );

  app.post(
    '/api/v2/firmware/actions/update',
    requireApiV2Auth,
    update,
    invoke(
      (service) => service.startUpdate(),
      { statusCode: 202 }
    )
  );
}

module.exports = {
  installFirmwareRoutes,
  mapFirmwareError
};
