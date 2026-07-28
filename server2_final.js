'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A jelenlegi monolitikus szerver változatlanul a server2_legacy.js fájlban
 * marad. Az új core modulok egységes futásidejű kontextust készítenek, majd
 * az indító beépíti a health és API v2 modulokat és elindítja a régi szervert.
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
  installExpressHealthBootstrap
} = require('./server/health-bootstrap');

const {
  installExpressApiV2Bootstrap
} = require('./server/api/v2/api-v2-bootstrap');

const CORE_RUNTIME_STATE = Symbol.for(
  'arduino-led-controller.core-runtime'
);

const paths = createRuntimePaths();
const config = loadRuntimeConfig({ paths });
const logger = createLogger({
  serviceName: config.service.name,
  level: config.logging.level,
  dataDir: config.paths.dataDir,
  enableFileLogging: false,
  silent: config.service.environment === 'test'
});

globalThis[CORE_RUNTIME_STATE] = Object.freeze({
  config,
  logger,
  paths
});

installExpressHealthBootstrap();
installExpressApiV2Bootstrap();
require('./server2_legacy');
