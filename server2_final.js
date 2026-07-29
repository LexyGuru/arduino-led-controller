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
  RuntimeSettingsService
} = require(
  './server/core/runtime-settings-service'
);

const {
  HttpServerRegistry,
  installHttpServerRegistryPatch
} = require(
  './server/http/http-server-registry'
);

const {
  ApiTokenStore
} = require(
  './server/security/api-token-store'
);

const {
  ApiTokenRepository
} = require(
  './server/security/api-token-repository'
);

const {
  ApiTokenService
} = require(
  './server/security/api-token-service'
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
  ArduinoStatusMonitor
} = require(
  './server/arduino/arduino-status-monitor'
);

const {
  ArduinoConsoleService
} = require(
  './server/arduino/arduino-console-service'
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
  ScheduleFileService
} = require(
  './server/files/schedule-file-service'
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
  FirmwareBackupStore
} = require(
  './server/firmware/firmware-backup-store'
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
  MaintenanceModeService
} = require(
  './server/system/maintenance-mode-service'
);

const {
  ConfigPreflightService
} = require(
  './server/system/config-preflight-service'
);

const {
  SystemSnapshotService
} = require(
  './server/system/snapshot-service'
);

const {
  MigrationService
} = require(
  './server/system/migration-service'
);

const {
  ReleaseInfoService
} = require(
  './server/system/release-info-service'
);

const {
  ReleaseGateService
} = require(
  './server/release/release-gate-service'
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

const {
  installLegacyApiAdapters
} = require(
  './server/legacy/legacy-api-bootstrap'
);

const {
  installLegacyCronGuard
} = require(
  './server/legacy/legacy-cron-guard'
);

const {
  LegacyCutoverService
} = require(
  './server/legacy/legacy-cutover-service'
);

const {
  installStaticWebAssets
} = require(
  './server/web/static-web-installer'
);

const {
  LegacyEventBridge
} = require(
  './server/legacy/legacy-event-bridge'
);

const {
  withSuppressedSignalHandlers
} = require(
  './server/legacy/legacy-signal-guard'
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

const httpServerRegistry =
  new HttpServerRegistry({
    closeTimeoutMs:
      config.http
        .shutdownTimeoutMs,
    logger
  });

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

const apiTokenRepository =
  new ApiTokenRepository({
    filePath:
      paths.apiTokenFile,
    logger,
    maximumRecords:
      config.apiV2
        .maximumManagedTokens
  });

const apiTokenService =
  new ApiTokenService({
    repository:
      apiTokenRepository,
    tokenStore:
      apiTokenStore,
    eventBus,
    auditLog,
    logger,
    tokenBytes:
      config.apiV2
        .managedTokenBytes
  });

apiTokenService.initialize();

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

const arduinoStatusMonitor =
  new ArduinoStatusMonitor({
    arduinoClient,
    eventBus,
    metrics,
    logger,
    intervalMs:
      config.monitor.intervalMs,
    timeoutMs:
      config.monitor.timeoutMs
  });

const arduinoConsoleService =
  new ArduinoConsoleService({
    arduinoClient,
    eventBus,
    metrics,
    logger,
    cacheLimit:
      config.console.cacheLimit,
    maximumPages:
      config.console.maximumPages,
    cacheTtlMs:
      config.console.cacheTtlMs
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

const scheduleFileService =
  new ScheduleFileService({
    schedulesDir:
      paths.schedulesDir,
    arduinoClient,
    uploadEndpoint:
      config.files.arduinoScheduleUploadEndpoint,
    maximumBytes:
      config.files.maximumScheduleBytes,
    eventBus,
    logger
  });

const legacyCronGuard =
  installLegacyCronGuard({
    suppressLocalScheduleCron:
      config.legacy.suppressLocalScheduleCron,
    suppressStatusCron:
      config.legacy.suppressStatusCron,
    logger
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

const runtimeSettingsService =
  new RuntimeSettingsService({
    settingsFile:
      paths.runtimeSettingsFile,
    arduinoClient,
    otaRunner,
    logger,
    eventBus
  });

const firmwareBackupStore =
  new FirmwareBackupStore({
    backupDir:
      paths.firmwareBackupDir,
    maximumBackups:
      config.firmware
        .maximumBackups,
    logger
  });

const firmwareService =
  new FirmwareService({
    arduinoClient,
    releaseClient:
      firmwareReleaseClient,
    otaRunner,
    backupStore:
      firmwareBackupStore,
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

const maintenanceService =
  new MaintenanceModeService({
    stateFile:
      paths.maintenanceStateFile,
    logger,
    eventBus,
    initialEnabled:
      config.maintenance
        .initialEnabled
  });

const configPreflightService =
  new ConfigPreflightService({
    config,
    paths,
    apiTokenStore,
    logger
  });

const snapshotService =
  new SystemSnapshotService({
    snapshotsDir:
      paths.snapshotsDir,
    maximumSnapshots:
      config.snapshots
        .maximumSnapshots,
    logger,
    eventBus,
    sources: [
      {
        name: 'config',
        path:
          paths.configDir
      },
      {
        name: 'schedules',
        path:
          paths.schedulesDir
      },
      {
        name: 'runtime-settings',
        path:
          paths.runtimeSettingsFile
      }
    ]
  });

const migrationService =
  new MigrationService({
    paths,
    logger,
    eventBus
  });

const releaseInfoService =
  new ReleaseInfoService({
    config,
    paths,
    lifecycle,
    maintenanceService,
    migrationService
  });

const releaseGateService =
  new ReleaseGateService({
    reportDirectory:
      paths.releaseGateReportDir,
    approvalFile:
      paths.releasePromotionApprovalFile,
    projectRoot:
      paths.projectRoot,
    metadataFile:
      paths.releaseMetadataFile,
    version:
      config.service.version,
    targetVersion:
      config.release
        .targetVersion,
    maxAgeHours:
      config.release
        .gateMaxAgeHours,
    preflightProvider:
      () =>
        configPreflightService
          .run(),
    maintenanceProvider:
      () =>
        maintenanceService
          .getStatus(),
    migrationProvider:
      () =>
        migrationService
          .status(),
    logger,
    eventBus
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

const legacyEventBridge =
  new LegacyEventBridge({
    eventBus,
    logger
  });

const legacyCutoverService =
  new LegacyCutoverService({
    config,
    cronGuard:
      legacyCronGuard,
    localScheduleRunner,
    arduinoStatusMonitor,
    arduinoConsoleService,
    scheduleFileService
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
  httpServerRegistry,
  metrics,
  eventStore,
  eventBus,
  auditLog,
  apiTokenStore,
  apiTokenRepository,
  apiTokenService,
  userRepository,
  sessionService,
  arduinoClient,
  arduinoStatusMonitor,
  arduinoConsoleService,
  ledService,
  scheduleService,
  localScheduleRepository,
  localScheduleRunner,
  localScheduleService,
  scheduleFileService,
  legacyCronGuard,
  legacyCutoverService,
  firmwareReleaseClient,
  firmwareBackupStore,
  otaRunner,
  runtimeSettingsService,
  firmwareService,
  openApiService,
  maintenanceService,
  configPreflightService,
  snapshotService,
  migrationService,
  releaseInfoService,
  releaseGateService,
  socketGateway,
  legacyEventBridge,
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
    'http-servers',
    () =>
      httpServerRegistry
        .closeAll()
  )
  .register(
    'socket-gateway',
    () =>
      socketGateway
        .close({
          timeoutMs:
            config.http
              .shutdownTimeoutMs
        })
  )
  .register(
    'legacy-event-bridge',
    () =>
      legacyEventBridge
        .close()
  )
  .register(
    'ota-runner',
    () =>
      otaRunner.cancel()
  )
  .register(
    'arduino-status-monitor',
    () =>
      arduinoStatusMonitor.stop()
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
  localScheduleRunner.start();
  logger.info(
    'A V5 helyi schedule runner aktív; a legacy percenkénti cron letiltva.'
  );
}

if (config.monitor.enabled) {
  arduinoStatusMonitor.start({ immediate: true });
}

registerExpressInstaller(
  'static-web-assets',
  installStaticWebAssets
);

registerExpressInstaller(
  'health',
  installHealthRoutes
);

registerExpressInstaller(
  'api-v2',
  installApiV2Routes
);

registerExpressInstaller(
  'legacy-service-adapters',
  installLegacyApiAdapters
);

registerSocketInstaller(
  'v5-event-gateway',
  (io) =>
    socketGateway
      .install(io)
);

if (
  config.legacy
    .socketEventBridgeEnabled
) {
  registerSocketInstaller(
    'legacy-event-bridge',
    (io) =>
      legacyEventBridge
        .install(io)
  );
}

installExpressFactoryPatch();
installSocketFactoryPatch();
installHttpServerRegistryPatch(
  httpServerRegistry
);

if (
  config.legacy
    .suppressSignalHandlers
) {
  withSuppressedSignalHandlers(
    () =>
      require(
        './server2_legacy'
      ),
    {
      logger
    }
  );
} else {
  require(
    './server2_legacy'
  );
}

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
