'use strict';

const express =
  require('express');

const {
  getRuntimeContext
} = require(
  '../../core/runtime-context'
);

const {
  createRequestMetricsMiddleware
} = require(
  '../../observability/metrics-registry'
);

const {
  apiV2RequestContext
} = require(
  './http-response'
);

const {
  requireApiV2Auth
} = require(
  './auth'
);

const {
  createPermissionMiddleware
} = require(
  './authorize'
);

const {
  PERMISSIONS
} = require(
  '../../security/roles'
);

const {
  apiV2CorsAndSecurity,
  apiV2OptionsHandler
} = require(
  './cors-security'
);

const {
  collectApiV2ReadinessChecks
} = require(
  './readiness'
);

const {
  apiV2ErrorHandler,
  apiV2NotFoundHandler
} = require(
  './error-handler'
);

const {
  createApiV2Handlers
} = require(
  './routes'
);

const {
  installOpenApiRoutes
} = require(
  './openapi-routes'
);

const {
  installSessionRoutes
} = require(
  './session-routes'
);

const {
  installUserRoutes
} = require(
  './user-routes'
);

const {
  installEventRoutes
} = require(
  './event-routes'
);

const {
  installObservabilityRoutes
} = require(
  './observability-routes'
);

const {
  installPrometheusRoutes
} = require(
  './prometheus-routes'
);

const {
  installSettingsRoutes
} = require(
  './settings-routes'
);

const {
  installArduinoConsoleRoutes
} = require(
  './arduino-console-routes'
);

const {
  installScheduleFileRoutes
} = require(
  './schedule-file-routes'
);

const {
  installCutoverRoutes
} = require(
  './cutover-routes'
);

const {
  installWebRoutes
} = require(
  './web-routes'
);

const {
  installLedRoutes
} = require(
  './led-routes'
);

const {
  installScheduleRoutes
} = require(
  './schedule-routes'
);

const {
  installLocalScheduleRoutes
} = require(
  './local-schedule-routes'
);

const {
  installFirmwareRoutes
} = require(
  './firmware-routes'
);

function installApiV2Routes(
  app
) {
  app.use(
    '/api/v2',
    express.json({
      limit:
        '2mb'
    }),
    express.urlencoded({
      extended:
        false,
      limit:
        '2mb'
    })
  );

  const handlers =
    createApiV2Handlers({
      readinessCollector:
        collectApiV2ReadinessChecks
    });

  const requestMetrics =
    createRequestMetricsMiddleware({
      metricsProvider:
        () =>
          getRuntimeContext()
            .metrics
    });

  const systemRead =
    createPermissionMiddleware(
      PERMISSIONS
        .SYSTEM_READ
    );

  const arduinoRead =
    createPermissionMiddleware(
      PERMISSIONS
        .ARDUINO_READ
    );

  app.use(
    '/api/v2',
    apiV2RequestContext,
    apiV2CorsAndSecurity,
    requestMetrics
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

  installOpenApiRoutes(
    app
  );

  app.get(
    '/api/v2/system/health',
    handlers.systemHealth
  );

  installSessionRoutes(
    app
  );

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

  installUserRoutes(
    app
  );

  installEventRoutes(
    app
  );

  installObservabilityRoutes(
    app
  );

  installPrometheusRoutes(
    app
  );

  installSettingsRoutes(
    app
  );

  installArduinoConsoleRoutes(
    app
  );

  installScheduleFileRoutes(
    app
  );

  installCutoverRoutes(
    app
  );

  installWebRoutes(
    app
  );

  installLedRoutes(
    app
  );

  installScheduleRoutes(
    app
  );

  installLocalScheduleRoutes(
    app
  );

  installFirmwareRoutes(
    app
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
