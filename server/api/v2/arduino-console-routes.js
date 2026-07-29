'use strict';

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
  sendSuccess
} = require('./http-response');
const {
  asyncRoute
} = require('./routes');

function wrap(operation) {
  return asyncRoute(async (req, res) => {
    try {
      return sendSuccess(req, res, await operation(getRuntimeContext(), req));
    } catch (error) {
      throw mapArduinoClientError(error);
    }
  });
}

function installArduinoConsoleRoutes(app) {
  const read = createPermissionMiddleware(PERMISSIONS.CONSOLE_READ);
  const write = createPermissionMiddleware(PERMISSIONS.CONSOLE_WRITE);

  app.get(
    '/api/v2/arduino/console/logs',
    requireApiV2Auth,
    read,
    wrap((runtime, req) => runtime.arduinoConsoleService.refresh({
      force: req.query?.force === '1' || req.query?.refresh === '1'
    }))
  );

  app.get(
    '/api/v2/arduino/console/stats',
    requireApiV2Auth,
    read,
    wrap((runtime) => runtime.arduinoConsoleService.getStats())
  );

  app.post(
    '/api/v2/arduino/console/actions/clear',
    requireApiV2Auth,
    write,
    wrap((runtime) => runtime.arduinoConsoleService.clear())
  );
}

module.exports = {
  installArduinoConsoleRoutes
};
