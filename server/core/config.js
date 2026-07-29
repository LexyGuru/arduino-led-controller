'use strict';

const fs = require('fs');

const {
  createRuntimePaths
} = require('./runtime-paths');

const SERVICE_NAME = 'arduino-led-controller';

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );
  } catch (_) {
    return null;
  }
}

function readProjectVersion(paths) {
  const versionData = readJsonFile(paths.versionFile);

  if (
    versionData &&
    typeof versionData.version === 'string' &&
    versionData.version.trim()
  ) {
    return versionData.version.trim();
  }

  const packageData = readJsonFile(paths.packageFile);

  if (
    packageData &&
    typeof packageData.version === 'string' &&
    packageData.version.trim()
  ) {
    return packageData.version.trim();
  }

  return '1.0.0';
}

function integerInRange(value, fallback, minimum, maximum) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function numberInRange(value, fallback, minimum, maximum) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function booleanFromEnvironment(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(
    String(value).trim().toLowerCase()
  );
}

function normalizePrivatePath(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!normalized) {
    return '';
  }

  return normalized.startsWith('/')
    ? normalized
    : `/${normalized}`;
}

function isConfiguredSecret(value, minimumLength) {
  const normalized = String(value || '').trim();

  return (
    normalized.length >= minimumLength &&
    !/CHANGE_THIS|CHANGEME|REPLACE_ME/i.test(normalized)
  );
}

function allowedOriginsFromEnvironment(environment) {
  return String(
    environment.API_V2_ALLOWED_ORIGIN ||
    environment.ALLOWED_ORIGIN ||
    '*'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function apiTokensFromEnvironment(environment) {
  const raw = String(
    environment.API_V2_TOKENS_JSON || ''
  ).trim();

  if (!raw) {
    return {
      tokens: [],
      parseError: null
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Az API_V2_TOKENS_JSON tömb legyen.');
    }

    return {
      tokens: parsed,
      parseError: null
    };
  } catch (error) {
    return {
      tokens: [],
      parseError: error.message
    };
  }
}

function loadRuntimeSettings(paths) {
  const saved = readJsonFile(paths.runtimeSettingsFile);

  return saved && typeof saved === 'object'
    ? saved
    : {};
}

function deepFreeze(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return value;
}

function loadRuntimeConfig(options = {}) {
  const environment = options.environment || process.env;

  const paths =
    options.paths ||
    createRuntimePaths(
      environment,
      options.projectRoot
    );

  const runtimeSettings = loadRuntimeSettings(paths);

  let arduinoIP = String(
    environment.ARDUINO_IP || '10.0.0.117'
  ).trim();

  if (
    typeof runtimeSettings.arduinoIP === 'string' &&
    runtimeSettings.arduinoIP.trim()
  ) {
    arduinoIP = runtimeSettings.arduinoIP.trim();
  }

  let arduinoPort = integerInRange(
    environment.ARDUINO_PORT,
    80,
    1,
    65535
  );

  arduinoPort = integerInRange(
    runtimeSettings.arduinoPort,
    arduinoPort,
    1,
    65535
  );

  const tokenConfiguration =
    apiTokensFromEnvironment(environment);

  const runnerMode = ['manual', 'active'].includes(
    String(
      environment.LOCAL_SCHEDULE_RUNNER_MODE ||
      'active'
    ).trim().toLowerCase()
  )
    ? String(
        environment.LOCAL_SCHEDULE_RUNNER_MODE ||
        'active'
      ).trim().toLowerCase()
    : 'manual';

  const configuration = {
    service: {
      name: SERVICE_NAME,
      version: readProjectVersion(paths),
      environment:
        String(environment.NODE_ENV || 'production').trim() ||
        'production'
    },
    http: {
      port: integerInRange(
        environment.PORT,
        3000,
        1,
        65535
      ),
      bindHost:
        String(environment.BIND_HOST || '0.0.0.0').trim() ||
        '0.0.0.0',
      allowedOrigin:
        String(environment.ALLOWED_ORIGIN || '*').trim() ||
        '*',
      shutdownTimeoutMs: numberInRange(
        environment.HTTP_SHUTDOWN_TIMEOUT_MS,
        8000,
        250,
        60000
      )
    },
    arduino: {
      ip: arduinoIP,
      port: arduinoPort,
      apiPath: normalizePrivatePath(
        environment.ARDUINO_API_PATH
      ),
      apiKey: String(
        environment.ARDUINO_API_KEY || ''
      ).trim(),
      consolePort: integerInRange(
        environment.CONSOLE_PORT,
        81,
        1,
        65535
      ),
      timeoutMs: numberInRange(
        environment.ARDUINO_TIMEOUT_MS,
        30000,
        500,
        120000
      ),
      healthTimeoutMs: numberInRange(
        environment.ARDUINO_HEALTH_TIMEOUT_MS,
        2500,
        500,
        10000
      )
    },
    console: {
      cacheLimit: integerInRange(
        environment.ARDUINO_CONSOLE_CACHE_LIMIT,
        200,
        10,
        2000
      ),
      maximumPages: integerInRange(
        environment.ARDUINO_CONSOLE_MAX_PAGES,
        24,
        1,
        100
      ),
      cacheTtlMs: numberInRange(
        environment.ARDUINO_CONSOLE_CACHE_TTL_MS,
        2500,
        250,
        60000
      )
    },
    monitor: {
      enabled: booleanFromEnvironment(
        environment.ARDUINO_STATUS_MONITOR_ENABLED,
        true
      ),
      intervalMs: numberInRange(
        environment.ARDUINO_STATUS_MONITOR_INTERVAL_MS,
        30000,
        5000,
        300000
      ),
      timeoutMs: numberInRange(
        environment.ARDUINO_STATUS_MONITOR_TIMEOUT_MS,
        5000,
        500,
        30000
      )
    },
    files: {
      maximumScheduleBytes: numberInRange(
        environment.SCHEDULE_FILE_MAXIMUM_BYTES,
        1024 * 1024,
        1024,
        10 * 1024 * 1024
      ),
      arduinoScheduleUploadEndpoint: String(
        environment.ARDUINO_SCHEDULE_UPLOAD_ENDPOINT || ''
      ).trim().replace(/^\/+/, '')
    },
    web: {
      staticAssetsEnabled: booleanFromEnvironment(
        environment.STATIC_WEB_ASSETS_ENABLED,
        true
      ),
      staticCacheSeconds: integerInRange(
        environment.STATIC_WEB_CACHE_SECONDS,
        300,
        0,
        86400
      )
    },
    apiV2: {
      token: String(
        environment.API_V2_TOKEN || ''
      ).trim(),
      role: [
        'admin',
        'operator',
        'viewer'
      ].includes(
        String(
          environment.API_V2_ROLE ||
          'admin'
        ).trim().toLowerCase()
      )
        ? String(
            environment.API_V2_ROLE ||
            'admin'
          ).trim().toLowerCase()
        : 'admin',
      tokens: tokenConfiguration.tokens,
      tokensParseError: tokenConfiguration.parseError,
      managedTokenBytes:
        integerInRange(
          environment.API_TOKEN_BYTES,
          32,
          24,
          64
        ),
      maximumManagedTokens:
        integerInRange(
          environment.API_TOKEN_MAXIMUM_RECORDS,
          100,
          1,
          500
        ),
      allowedOrigins:
        allowedOriginsFromEnvironment(environment)
    },
    schedule: {
      runnerMode,
      timeZone:
        String(environment.TZ || 'Europe/Vienna').trim() ||
        'Europe/Vienna',
      runnerIntervalMs: numberInRange(
        environment.LOCAL_SCHEDULE_RUNNER_INTERVAL_MS,
        15000,
        5000,
        60000
      )
    },
    firmware: {
      repository:
        String(
          environment.FIRMWARE_REPOSITORY ||
          'LexyGuru/arduino-led-controller'
        ).trim(),
      releaseTag:
        String(
          environment.FIRMWARE_RELEASE_TAG ||
          'firmware-latest'
        ).trim(),
      githubToken:
        String(environment.GITHUB_TOKEN || '').trim(),
      otaPassword:
        String(environment.OTA_PASSWORD || ''),
      otaPort: integerInRange(
        environment.OTA_PORT,
        65280,
        1,
        65535
      ),
      otaUsername:
        String(environment.OTA_USERNAME || 'arduino').trim() ||
        'arduino',
      maximumBytes: numberInRange(
        environment.FIRMWARE_MAXIMUM_BYTES,
        16 * 1024 * 1024,
        1024,
        64 * 1024 * 1024
      ),
      uploadTimeoutMs: numberInRange(
        environment.FIRMWARE_UPLOAD_TIMEOUT_MS,
        240000,
        30000,
        600000
      ),
      restartTimeoutMs: numberInRange(
        environment.FIRMWARE_RESTART_TIMEOUT_MS,
        90000,
        10000,
        300000
      ),
      maximumBackups: integerInRange(
        environment.FIRMWARE_MAXIMUM_BACKUPS,
        8,
        2,
        50
      )
    },
    security: {
      cookieSecure: booleanFromEnvironment(
        environment.COOKIE_SECURE,
        false
      ),
      sessionDurationMs: numberInRange(
        environment.SESSION_DURATION_MS,
        12 * 60 * 60 * 1000,
        5 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000
      )
    },
    events: {
      historyLimit: integerInRange(
        environment.EVENT_HISTORY_LIMIT,
        200,
        10,
        2000
      ),
      socketRecentLimit: integerInRange(
        environment.SOCKET_RECENT_EVENT_LIMIT,
        25,
        1,
        100
      ),
      persistentMaximumBytes: numberInRange(
        environment.EVENT_STORE_MAXIMUM_BYTES,
        5 * 1024 * 1024,
        64 * 1024,
        100 * 1024 * 1024
      ),
      persistentMaximumArchives: integerInRange(
        environment.EVENT_STORE_MAXIMUM_ARCHIVES,
        5,
        1,
        50
      )
    },
    audit: {
      maximumBytes: numberInRange(
        environment.AUDIT_MAXIMUM_BYTES,
        5 * 1024 * 1024,
        64 * 1024,
        100 * 1024 * 1024
      ),
      maximumArchives: integerInRange(
        environment.AUDIT_MAXIMUM_ARCHIVES,
        5,
        1,
        50
      )
    },
    lifecycle: {
      shutdownGraceMs: numberInRange(
        environment.SHUTDOWN_GRACE_MS,
        10000,
        1000,
        60000
      )
    },
    maintenance: {
      initialEnabled: booleanFromEnvironment(
        environment.MAINTENANCE_MODE,
        false
      )
    },
    snapshots: {
      maximumSnapshots: integerInRange(
        environment.SYSTEM_MAXIMUM_SNAPSHOTS,
        10,
        2,
        100
      )
    },
    release: {
      channel:
        String(
          environment.RELEASE_CHANNEL ||
          'alpha'
        ).trim() ||
        'alpha',
      candidate:
        String(
          environment.RELEASE_CANDIDATE ||
          ''
        ).trim(),
      commit:
        String(
          environment.RELEASE_COMMIT ||
          ''
        ).trim(),
      builtAt:
        String(
          environment.RELEASE_BUILT_AT ||
          ''
        ).trim()
    },
    legacy: {
      apiAdaptersEnabled: booleanFromEnvironment(
        environment.LEGACY_API_ADAPTERS_ENABLED,
        true
      ),
      localScheduleAdaptersEnabled: booleanFromEnvironment(
        environment.LEGACY_LOCAL_SCHEDULE_ADAPTERS_ENABLED,
        true
      ),
      socketEventBridgeEnabled: booleanFromEnvironment(
        environment.LEGACY_SOCKET_EVENT_BRIDGE_ENABLED,
        true
      ),
      suppressSignalHandlers: booleanFromEnvironment(
        environment.LEGACY_SUPPRESS_SIGNAL_HANDLERS,
        true
      ),
      suppressLocalScheduleCron: booleanFromEnvironment(
        environment.LEGACY_SUPPRESS_LOCAL_SCHEDULE_CRON,
        true
      ),
      suppressStatusCron: booleanFromEnvironment(
        environment.LEGACY_SUPPRESS_STATUS_CRON,
        true
      )
    },
    logging: {
      level:
        String(environment.LOG_LEVEL || 'info').trim() ||
        'info'
    },
    paths
  };

  return deepFreeze(configuration);
}

module.exports = {
  SERVICE_NAME,
  allowedOriginsFromEnvironment,
  apiTokensFromEnvironment,
  booleanFromEnvironment,
  deepFreeze,
  integerInRange,
  isConfiguredSecret,
  loadRuntimeConfig,
  normalizePrivatePath,
  numberInRange,
  readJsonFile,
  readProjectVersion
};
