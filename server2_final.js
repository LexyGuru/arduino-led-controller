'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A legacy alkalmazás továbbra is a server2_legacy.js fájlban marad.
 * Az új réteg közös Arduino-, LED-, schedule- és firmware
 * szolgáltatásokat biztosít az API v2 számára.
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
  ApiTokenStore
} = require('./server/security/api-token-store');

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
  LocalScheduleRepository
} = require('./server/schedule/local-schedule-repository');

const {
  LocalScheduleRunner
} = require('./server/schedule/local-schedule-runner');

const {
  LocalScheduleService
} = require('./server/schedule/local-schedule-service');

const {
  FirmwareReleaseClient
} = require('./server/firmware/firmware-release-client');

const {
  OtaRunner
} = require('./server/firmware/ota-runner');

const {
  FirmwareService
} = require('./server/firmware/firmware-service');

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

const paths =
  createRuntimePaths();

const config =
  loadRuntimeConfig({
    paths
  });

const logger =
  createLogger({
    serviceName:
      config.service.name,
    level:
      config.logging.level,
    dataDir:
      config.paths.dataDir,
    enableFileLogging:
      false,
    silent:
      config.service.environment ===
      'test'
  });

const apiTokenStore =
  ApiTokenStore.fromConfig(
    config.apiV2
  );

const arduinoClient =
  new ArduinoClient({
    config:
      config.arduino,
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

const localScheduleRepository =
  new LocalScheduleRepository({
    filePath:
      paths.localSchedulesFile,
    backupDir:
      paths.localScheduleBackupDir,
    logger
  });

const localScheduleRunner =
  new LocalScheduleRunner({
    repository:
      localScheduleRepository,
    ledService,
    logger,
    timeZone:
      config.schedule.timeZone,
    intervalMs:
      config.schedule
        .runnerIntervalMs
  });

const localScheduleService =
  new LocalScheduleService({
    repository:
      localScheduleRepository,
    runner:
      localScheduleRunner,
    arduinoScheduleService:
      scheduleService
  });

const firmwareReleaseClient =
  new FirmwareReleaseClient({
    repository:
      config.firmware.repository,
    releaseTag:
      config.firmware.releaseTag,
    githubToken:
      config.firmware.githubToken,
    maximumBytes:
      config.firmware.maximumBytes
  });

const otaRunner =
  new OtaRunner({
    toolPath:
      paths.otaToolPath,
    address:
      config.arduino.ip,
    port:
      config.firmware.otaPort,
    username:
      config.firmware.otaUsername,
    password:
      config.firmware.otaPassword,
    timeoutMs:
      config.firmware
        .uploadTimeoutMs
  });

const firmwareService =
  new FirmwareService({
    arduinoClient,
    releaseClient:
      firmwareReleaseClient,
    otaRunner,
    firmwareDir:
      paths.firmwareDir,
    otaToolPath:
      paths.otaToolPath,
    otaPassword:
      config.firmware.otaPassword,
    repository:
      config.firmware.repository,
    releaseTag:
      config.firmware.releaseTag,
    logger,
    restartTimeoutMs:
      config.firmware
        .restartTimeoutMs
  });

setRuntimeContext({
  startedAt:
    new Date(),
  config,
  paths,
  logger,
  apiTokenStore,
  arduinoClient,
  ledService,
  scheduleService,
  localScheduleRepository,
  localScheduleRunner,
  localScheduleService,
  firmwareReleaseClient,
  otaRunner,
  firmwareService
});

if (
  config.schedule.runnerMode ===
  'active'
) {
  logger.warn(
    'A V5 helyi schedule runner aktív. A legacy runner kikapcsolása nélkül ugyanaz az időzítés kétszer futhat le.'
  );

  localScheduleRunner.start();
}

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
