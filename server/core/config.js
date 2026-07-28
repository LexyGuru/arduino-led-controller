'use strict';

const fs = require('fs');

const {
  createRuntimePaths
} = require('./runtime-paths');

const SERVICE_NAME = 'arduino-led-controller';

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;

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

function integerInRange(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return fallback;

  if (parsed < minimum || parsed > maximum) {
    return fallback;
  }

  return parsed;
}

function numberInRange(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(
    maximum,
    Math.max(minimum, parsed)
  );
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

  if (!normalized) return '';

  return normalized.startsWith('/')
    ? normalized
    : `/${normalized}`;
}

function isConfiguredSecret(value, minimumLength) {
  const normalized = String(value || '').trim();

  return (
    normalized.length >= minimumLength &&
    !/CHANGE_THIS|CHANGEME|REPLACE_ME/i.test(
      normalized
    )
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

function loadRuntimeSettings(paths) {
  const saved = readJsonFile(
    paths.runtimeSettingsFile
  );

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
  const environment =
    options.environment || process.env;

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

  const configuration = {
    service: {
      name: SERVICE_NAME,
      version: readProjectVersion(paths),
      environment:
        String(
          environment.NODE_ENV || 'production'
        ).trim() || 'production'
    },
    http: {
      port: integerInRange(
        environment.PORT,
        3000,
        1,
        65535
      ),
      bindHost:
        String(
          environment.BIND_HOST || '0.0.0.0'
        ).trim() || '0.0.0.0',
      allowedOrigin:
        String(
          environment.ALLOWED_ORIGIN || '*'
        ).trim() || '*'
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
      allowedOrigins:
        allowedOriginsFromEnvironment(
          environment
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
      otaPassword: String(
        environment.OTA_PASSWORD || ''
      )
    },
    security: {
      cookieSecure: booleanFromEnvironment(
        environment.COOKIE_SECURE,
        false
      )
    },
    logging: {
      level:
        String(
          environment.LOG_LEVEL || 'info'
        ).trim() || 'info'
    },
    paths
  };

  return deepFreeze(configuration);
}

module.exports = {
  SERVICE_NAME,
  allowedOriginsFromEnvironment,
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
