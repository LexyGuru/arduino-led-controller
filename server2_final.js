'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A monolitikus alkalmazás továbbra is a server2_legacy.js fájlban marad.
 * Az új V5 réteg közös Arduino-, LED- és schedule szolgáltatásokat,
 * valamint egyetlen Express bootstrap-regisztert használ.
 */

require('dotenv').config();

const {
  createRuntimePaths
} = require('./server/core/runtime-paths');

const {
  loadRuntimeConfig
} = require('./server/core/config');

const {
  createLogger
} = require('./server/core/logger');

const {
  setRuntimeContext
} = require('./server/core/runtime-context');

const {
  ArduinoClient
} = require('./server/arduino/arduino-client');

const {
  LedService
} = require('./server/led/led-service');

const {
  ScheduleService
} = require('./server/schedule/schedule-service');

const {
  installExpressFactoryPatch,
  registerExpressInstaller
} = require('./server/express/express-bootstrap-registry');

const {
  installHealthRoutes
} = require('./server/health-bootstrap');

const {
  installApiV2Routes
} = require('./server/api/v2/api-v2-bootstrap');

const paths = createRuntimePaths();

const config = loadRuntimeConfig({
  paths
});

const logger = createLogger({
  serviceName:
    config.service.name,
  level:
    config.logging.level,
  dataDir:
    config.paths.dataDir,
  enableFileLogging: false,
  silent:
    config.service.environment === 'test'
});

const arduinoClient =
  new ArduinoClient({
    config: config.arduino,
    logger
  });

const ledService =
  new LedService({
    arduinoClient,
    logger
  });

const scheduleService =
  new ScheduleService({
    arduinoClient,
    logger
  });

setRuntimeContext({
  startedAt: new Date(),
  config,
  paths,
  logger,
  arduinoClient,
  ledService,
  scheduleService
});

registerExpressInstaller(
  'health',
  installHealthRoutes
);

registerExpressInstaller(
  'api-v2',
  installApiV2Routes
);

installExpressFactoryPatch();

require('./server2_legacy');
