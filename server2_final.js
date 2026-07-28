'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A monolitikus alkalmazás továbbra is a server2_legacy.js fájlban marad.
 * Ez az indító elkészíti a központi runtime contextet és a megosztott
 * Arduino-klienst, majd beépíti a health és API v2 modulokat.
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
  installExpressHealthBootstrap
} = require('./server/health-bootstrap');

const {
  installExpressApiV2Bootstrap
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

setRuntimeContext({
  startedAt: new Date(),
  config,
  paths,
  logger,
  arduinoClient
});

installExpressHealthBootstrap();
installExpressApiV2Bootstrap();

require('./server2_legacy');
