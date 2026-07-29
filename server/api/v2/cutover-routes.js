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
  sendSuccess
} = require('./http-response');
const {
  asyncRoute
} = require('./routes');

function installCutoverRoutes(app) {
  const readSystem = createPermissionMiddleware(PERMISSIONS.CUTOVER_READ);
  const readArduino = createPermissionMiddleware(PERMISSIONS.ARDUINO_READ);

  app.get(
    '/api/v2/system/cutover',
    requireApiV2Auth,
    readSystem,
    (req, res) => sendSuccess(
      req,
      res,
      getRuntimeContext().legacyCutoverService.snapshot()
    )
  );

  app.get(
    '/api/v2/arduino/monitor',
    requireApiV2Auth,
    readArduino,
    (req, res) => sendSuccess(
      req,
      res,
      getRuntimeContext().arduinoStatusMonitor.getStatus()
    )
  );

  app.post(
    '/api/v2/arduino/monitor/actions/poll',
    requireApiV2Auth,
    readArduino,
    asyncRoute(async (req, res) => sendSuccess(
      req,
      res,
      await getRuntimeContext().arduinoStatusMonitor.poll()
    ))
  );
}

module.exports = {
  installCutoverRoutes
};
