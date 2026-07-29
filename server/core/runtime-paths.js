'use strict';

const path = require('path');

const DEFAULT_PROJECT_ROOT =
  path.resolve(
    __dirname,
    '../..'
  );

function resolveFromRoot(
  projectRoot,
  value,
  fallback
) {
  const selected =
    String(
      value ||
      fallback ||
      ''
    ).trim();

  if (!selected) {
    throw new Error(
      'A futásidejű útvonal nem lehet üres.'
    );
  }

  return path.isAbsolute(
    selected
  )
    ? path.normalize(
        selected
      )
    : path.resolve(
        projectRoot,
        selected
      );
}

function createRuntimePaths(
  environment = process.env,
  projectRoot =
    DEFAULT_PROJECT_ROOT
) {
  const root =
    path.resolve(
      projectRoot
    );

  const dataDir =
    resolveFromRoot(
      root,
      environment.DATA_DIR,
      'data'
    );

  const configDir =
    resolveFromRoot(
      root,
      environment.CONFIG_DIR,
      'config'
    );

  const schedulesDir =
    resolveFromRoot(
      root,
      environment.SCHEDULES_DIR,
      'schedules'
    );

  const firmwareDir =
    resolveFromRoot(
      root,
      environment.FIRMWARE_DIR,
      path.join(
        dataDir,
        'firmware'
      )
    );

  return Object.freeze({
    projectRoot:
      root,
    dataDir,
    configDir,
    schedulesDir,
    firmwareDir,
    publicDir:
      resolveFromRoot(
        root,
        environment.PUBLIC_DIR,
        'public'
      ),
    authFile:
      resolveFromRoot(
        root,
        environment.AUTH_FILE,
        path.join(
          configDir,
          'users.json'
        )
      ),
    apiTokenFile:
      resolveFromRoot(
        root,
        environment.API_TOKEN_FILE,
        path.join(
          configDir,
          'api-v2-tokens.json'
        )
      ),
    auditFile:
      resolveFromRoot(
        root,
        environment.AUDIT_FILE,
        path.join(
          dataDir,
          'audit-log.jsonl'
        )
      ),
    eventStoreFile:
      resolveFromRoot(
        root,
        environment.EVENT_STORE_FILE,
        path.join(
          dataDir,
          'events.jsonl'
        )
      ),
    eventArchiveDir:
      resolveFromRoot(
        root,
        environment.EVENT_ARCHIVE_DIR,
        path.join(
          dataDir,
          'event-archive'
        )
      ),
    localSchedulesFile:
      resolveFromRoot(
        root,
        environment.LOCAL_SCHEDULES_FILE,
        path.join(
          schedulesDir,
          'weekly-led-schedules.json'
        )
      ),
    localScheduleBackupDir:
      resolveFromRoot(
        root,
        environment.LOCAL_SCHEDULE_BACKUP_DIR,
        path.join(
          schedulesDir,
          'backups'
        )
      ),
    firmwareBackupDir:
      resolveFromRoot(
        root,
        environment.FIRMWARE_BACKUP_DIR,
        path.join(
          firmwareDir,
          'backups'
        )
      ),
    otaToolPath:
      resolveFromRoot(
        root,
        environment.OTA_TOOL_PATH,
        path.join(
          'tools',
          'arduinoOTA',
          'arduinoOTA'
        )
      ),
    openApiDocumentFile:
      resolveFromRoot(
        root,
        environment.OPENAPI_DOCUMENT_FILE,
        path.join(
          'docs',
          'api',
          'openapi-v2.json'
        )
      ),
    packageFile:
      path.join(
        root,
        'package.json'
      ),
    versionFile:
      path.join(
        root,
        'version.json'
      ),
    runtimeSettingsFile:
      path.join(
        configDir,
        'server-settings.json'
      ),
    snapshotsDir:
      resolveFromRoot(
        root,
        environment.SYSTEM_SNAPSHOTS_DIR,
        path.join(
          dataDir,
          'snapshots'
        )
      ),
    migrationDir:
      resolveFromRoot(
        root,
        environment.SYSTEM_MIGRATION_DIR,
        path.join(
          dataDir,
          'migrations'
        )
      ),
    migrationStateFile:
      resolveFromRoot(
        root,
        environment.SYSTEM_MIGRATION_STATE_FILE,
        path.join(
          dataDir,
          'migrations',
          'state.json'
        )
      ),
    maintenanceStateFile:
      resolveFromRoot(
        root,
        environment.MAINTENANCE_STATE_FILE,
        path.join(
          dataDir,
          'maintenance.json'
        )
      )
  });
}

module.exports = {
  DEFAULT_PROJECT_ROOT,
  createRuntimePaths,
  resolveFromRoot
};
