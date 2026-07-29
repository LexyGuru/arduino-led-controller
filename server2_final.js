'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A legacy alkalmazás továbbra is a server2_legacy.js fájlban marad.
 * Az új réteg közös runtime-, biztonsági, esemény-, megfigyelhetőségi,
 * Socket.IO-, Arduino-, LED-, schedule- és firmware-szolgáltatásokat biztosít.
 */

require('dotenv').config();

const {
  createRuntimePaths
} = require(
  './server/core/runtime-paths'
);

const {
  loadRuntimeConfig
} = require(
  './server/core/config'
);

const {
  closeLogger,
  createLogger
} = require(
  './server/core/logger'
);

const {
  getRuntimeContext,
  setRuntimeContext
} = require(
  './server/core/runtime-context'
);

const {
  LifecycleManager
} = require(
  './server/core/lifecycle-manager'
);

const {
  ShutdownCoordinator
} = require(
  './server/core/shutdown-coordinator'
);

const {
  ApiTokenStore
} = require(
  './server/security/api-token-store'
);

const {
  UserRepository
} = require(
  './server/security/user-repository'
);

const {
  SessionService
} = require(
  './server/security/session-service'
);

const {
  EventStore
} = require(
  './server/events/event-store'
);

const {
  EventBus
} = require(
  './server/events/event-bus'
);

const {
  MetricsRegistry
} = require(
  './server/observability/metrics-registry'
);

const {
  AuditLog
} = require(
  './server/observability/audit-log'
);

const {
  DiagnosticsService
} = require(
  './server/observability/diagnostics-service'
);

const {
  ArduinoClient
} = require(
  './server/arduino/arduino-client'
);

const {
  LedService
} = require(
  './server/led/led-service'
);

const {
  ScheduleService
} = require(
  './server/schedule/schedule-service'
);

const {
  LocalScheduleRepository
} = require(
  './server/schedule/local-schedule-repository'
);

const {
  LocalScheduleRunner
} = require(
  './server/schedule/local-schedule-runner'
);

const {
  LocalScheduleService
} = require(
  './server/schedule/local-schedule-service'
);

const {
  FirmwareReleaseClient
} = require(
  './server/firmware/firmware-release-client'
);

const {
  OtaRunner
} = require(
  './server/firmware/ota-runner'
);

const {
  FirmwareService
} = require(
  './server/firmware/firmware-service'
);

const {
  OpenApiService
} = require(
  './server/api/v2/openapi-service'
);

const {
  installExpressFactoryPatch,
  registerExpressInstaller
} = require(
  './server/express/express-bootstrap-registry'
);

const {
  installSocketFactoryPatch,
  registerSocketInstaller
} = require(
  './server/socket/socket-bootstrap-registry'
);

const {
  SocketGateway
} = require(
  './server/socket/socket-gateway'
);

const {
  installHealthRoutes
} = require(
  './server/health-bootstrap'
);

const {
  installApiV2Routes
} = require(
  './server/api/v2/api-v2-bootstrap'
);

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

const lifecycle =
  new LifecycleManager();

const metrics =
  new MetricsRegistry();

const eventStore =
  new EventStore({
    filePath:
      paths.eventStoreFile,
    archiveDir:
      paths.eventArchiveDir,
    maximumBytes:
      config.events
        .persistentMaximumBytes,
    maximumArchives:
      config.events
        .persistentMaximumArchives,
    logger
  });

const eventBus =
  new EventBus({
    historyLimit:
      config.events.historyLimit,
    logger,
    store:
      eventStore,
    metrics
  });

const auditLog =
  new AuditLog({
    filePath:
      paths.auditFile,
    maximumBytes:
      config.audit.maximumBytes,
    maximumArchives:
      config.audit.maximumArchives,
    logger,
    eventBus
  });

const apiTokenStore =
  ApiTokenStore.fromConfig(
    config.apiV2
  );

const userRepository =
  new UserRepository({
    filePath:
      paths.authFile,
    logger,
    eventBus
  });

const sessionService =
  new SessionService({
    userRepository,
    cookieSecure:
      config.security
        .cookieSecure,
    sessionDurationMs:
      config.security
        .sessionDurationMs,
    eventBus
  });

const arduinoClient =
  new ArduinoClient({
    config:
      config.arduino,
    logger
  });

const ledService =
  new LedService({
    arduinoClient,
    logger,
    eventBus
  });

const scheduleService =
  new ScheduleService({
    arduinoClient,
    logger,
    eventBus
  });

const localScheduleRepository =
  new LocalScheduleRepository({
    filePath:
      paths.localSchedulesFile,
    backupDir:
      paths.localScheduleBackupDir,
    logger,
    eventBus
  });

const localScheduleRunner =
  new LocalScheduleRunner({
    repository:
      localScheduleRepository,
    ledService,
    logger,
    eventBus,
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
    eventBus,
    restartTimeoutMs:
      config.firmware
        .restartTimeoutMs
  });

const openApiService =
  new OpenApiService({
    documentPath:
      paths.openApiDocumentFile
  });

const socketGateway =
  new SocketGateway({
    eventBus,
    runtimeProvider:
      getRuntimeContext,
    logger,
    recentLimit:
      config.events
        .socketRecentLimit
  });

const diagnosticsService =
  new DiagnosticsService({
    runtimeProvider:
      getRuntimeContext
  });

const shutdownCoordinator =
  new ShutdownCoordinator({
    lifecycle,
    logger,
    eventBus,
    graceMs:
      config.lifecycle
        .shutdownGraceMs
  });

setRuntimeContext({
  startedAt:
    new Date(),
  config,
  paths,
  logger,
  lifecycle,
  metrics,
  eventStore,
  eventBus,
  auditLog,
  apiTokenStore,
  userRepository,
  sessionService,
  arduinoClient,
  ledService,
  scheduleService,
  localScheduleRepository,
  localScheduleRunner,
  localScheduleService,
  firmwareReleaseClient,
  otaRunner,
  firmwareService,
  openApiService,
  socketGateway,
  diagnosticsService,
  shutdownCoordinator
});

// A cleanupok fordított sorrendben futnak, ezért a logger kerül
// elsőként regisztrálásra és utolsóként záródik le.
shutdownCoordinator
  .register(
    'logger',
    () =>
      closeLogger(
        logger
      )
  )
  .register(
    'audit-log',
    () =>
      auditLog
        .flush()
  )
  .register(
    'event-store',
    () =>
      eventBus
        .flush()
  )
  .register(
    'socket-gateway',
    () =>
      socketGateway
        .close()
  )
  .register(
    'local-schedule-runner',
    () =>
      localScheduleRunner
        .stop()
  );

if (
  config.schedule.runnerMode ===
  'active'
) {
  logger.warn(
    'A V5 helyi schedule runner aktív. A legacy runner kikapcsolása nélkül ugyanaz az időzítés kétszer futhat le.'
  );

  localScheduleRunner
    .start();
}

registerExpressInstaller(
  'health',
  installHealthRoutes
);

registerExpressInstaller(
  'api-v2',
  installApiV2Routes
);

registerSocketInstaller(
  'v5-event-gateway',
  (io) =>
    socketGateway
      .install(io)
);

installExpressFactoryPatch();
installSocketFactoryPatch();

require('./server2_legacy');

lifecycle.markReady();

eventBus.publish(
  'system.ready',
  {
    version:
      config.service.version,
    environment:
      config.service.environment
  }
);

shutdownCoordinator
  .installProcessHandlers();
