'use strict';

const {
  apiV2RequestContext
} = require('./http-response');

const {
  requireApiV2Auth
} = require('./auth');

const {
  apiV2CorsAndSecurity,
  apiV2OptionsHandler
} = require('./cors-security');

const {
  collectApiV2ReadinessChecks
} = require('./readiness');

const {
  apiV2ErrorHandler,
  apiV2NotFoundHandler
} = require('./error-handler');

const {
  createApiV2Handlers
} = require('./routes');

function installApiV2Routes(app) {
  const handlers =
    createApiV2Handlers({
      readinessCollector:
        collectApiV2ReadinessChecks
    });

  app.use(
    '/api/v2',
    apiV2RequestContext,
    apiV2CorsAndSecurity
  );

  app.options(
    '/api/v2',
    apiV2OptionsHandler
  );

  app.options(
    '/api/v2/*',
    apiV2OptionsHandler
  );

  app.get(
    '/api/v2',
    handlers.discovery
  );

  app.get(
    '/api/v2/system/health',
    handlers.systemHealth
  );

  app.get(
    '/api/v2/system/status',
    requireApiV2Auth,
    handlers.systemStatus
  );

  app.get(
    '/api/v2/arduino/status',
    requireApiV2Auth,
    handlers.arduinoStatus
  );

  app.use(
    '/api/v2',
    apiV2NotFoundHandler
  );

  app.use(
    '/api/v2',
    apiV2ErrorHandler
  );
}

module.exports = {
  installApiV2Routes
};
