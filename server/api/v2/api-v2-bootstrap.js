'use strict';

const express = require('express');

const {
  apiV2RequestContext
} = require('./http-response');

const {
  requireApiV2Auth
} = require('./auth');

const {
  createPermissionMiddleware
} = require('./authorize');

const {
  PERMISSIONS
} = require('../../security/roles');

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

const {
  installSessionRoutes
} = require('./session-routes');

const {
  installEventRoutes
} = require('./event-routes');

const {
  installLedRoutes
} = require('./led-routes');

const {
  installScheduleRoutes
} = require('./schedule-routes');

const {
  installLocalScheduleRoutes
} = require('./local-schedule-routes');

const {
  installFirmwareRoutes
} = require('./firmware-routes');

function installApiV2Routes(app) {
  app.use(
    '/api/v2',
    express.json({
      limit: '2mb'
    }),
    express.urlencoded({
      extended: false,
      limit: '2mb'
    })
  );

  const handlers =
    createApiV2Handlers({
      readinessCollector:
        collectApiV2ReadinessChecks
    });

  const systemRead =
    createPermissionMiddleware(
      PERMISSIONS.SYSTEM_READ
    );

  const arduinoRead =
    createPermissionMiddleware(
      PERMISSIONS.ARDUINO_READ
    );

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

  installSessionRoutes(app);

  app.get(
    '/api/v2/system/status',
    requireApiV2Auth,
    systemRead,
    handlers.systemStatus
  );

  app.get(
    '/api/v2/arduino/status',
    requireApiV2Auth,
    arduinoRead,
    handlers.arduinoStatus
  );

  installEventRoutes(app);
  installLedRoutes(app);
  installScheduleRoutes(app);
  installLocalScheduleRoutes(app);
  installFirmwareRoutes(app);

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
