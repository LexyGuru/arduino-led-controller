'use strict';

const {
  PERMISSIONS
} = require('../../security/roles');
const {
  getRuntimeContext
} = require('../../core/runtime-context');
const {
  staticWebStatus
} = require('../../web/static-web-installer');
const {
  createPermissionMiddleware
} = require('./authorize');
const {
  requireApiV2Auth
} = require('./auth');
const {
  sendSuccess
} = require('./http-response');

function installWebRoutes(app) {
  const read = createPermissionMiddleware(PERMISSIONS.WEB_READ);
  app.get(
    '/api/v2/web/status',
    requireApiV2Auth,
    read,
    (req, res) => sendSuccess(req, res, staticWebStatus(getRuntimeContext()))
  );
}

module.exports = {
  installWebRoutes
};
