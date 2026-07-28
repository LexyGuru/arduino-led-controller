'use strict';

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { HttpError } = require('./http-error');
const {
  API_VERSION,
  apiV2RequestContext,
  sendError,
  sendSuccess,
  setApiResponseHeaders
} = require('./http-response');

const BOOTSTRAP_STATE = Symbol.for(
  'arduino-led-controller.api-v2-bootstrap-installed'
);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SERVER_STARTED_AT = Date.now();
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

function readProjectVersion() {
  const packageData = readJsonFile(
    path.join(PROJECT_ROOT, 'package.json')
  );

  if (
    packageData &&
    typeof packageData.version === 'string' &&
    packageData.version.trim()
  ) {
    return packageData.version.trim();
  }

  return 'unknown';
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

  return normalized.length >= minimumLength &&
    !/CHANGE_THIS|CHANGEME|REPLACE_ME/i.test(
      normalized
    );
}

function loadApiV2Configuration() {
  const configDir =
    process.env.CONFIG_DIR ||
    path.join(PROJECT_ROOT, 'config');

  const runtimeSettings = readJsonFile(
    path.join(configDir, 'server-settings.json')
  ) || {};

  const environmentPort = Number(
    process.env.ARDUINO_PORT
  );
  const runtimePort = Number(
    runtimeSettings.arduinoPort
  );

  let arduinoPort = Number.isInteger(
    environmentPort
  )
    ? environmentPort
    : 80;

  if (
    Number.isInteger(runtimePort) &&
    runtimePort > 0 &&
    runtimePort <= 65535
  ) {
    arduinoPort = runtimePort;
  }

  let arduinoIP = String(
    process.env.ARDUINO_IP || '10.0.0.117'
  ).trim();

  if (
    typeof runtimeSettings.arduinoIP === 'string' &&
    runtimeSettings.arduinoIP.trim()
  ) {
    arduinoIP = runtimeSettings.arduinoIP.trim();
  }

  return {
    version: readProjectVersion(),
    environment:
      process.env.NODE_ENV || 'production',
    apiV2Token: String(
      process.env.API_V2_TOKEN || ''
    ).trim(),
    apiV2AllowedOrigins: String(
      process.env.API_V2_ALLOWED_ORIGIN ||
      process.env.ALLOWED_ORIGIN ||
      '*'
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    arduinoIP,
    arduinoPort,
    arduinoApiPath: normalizePrivatePath(
      process.env.ARDUINO_API_PATH
    ),
    arduinoApiKey: String(
      process.env.ARDUINO_API_KEY || ''
    ).trim(),
    arduinoTimeoutMs: numberInRange(
      process.env.ARDUINO_HEALTH_TIMEOUT_MS ||
      process.env.ARDUINO_TIMEOUT_MS,
      2500,
      500,
      10000
    ),
    directories: {
      dataDir:
        process.env.DATA_DIR ||
        path.join(PROJECT_ROOT, 'data'),
      configDir,
      schedulesDir:
        process.env.SCHEDULES_DIR ||
        path.join(PROJECT_ROOT, 'schedules'),
      firmwareDir:
        process.env.FIRMWARE_DIR ||
        path.join(
          PROJECT_ROOT,
          'data',
          'firmware'
        )
    }
  };
}

function configurationChecks(configuration) {
  return [
    {
      name: 'apiV2Token',
      ok: isConfiguredSecret(
        configuration.apiV2Token,
        32
      ),
      code: 'API_V2_TOKEN_INVALID'
    },
    {
      name: 'arduinoTarget',
      ok:
        Boolean(configuration.arduinoIP) &&
        Number.isInteger(
          configuration.arduinoPort
        ) &&
        configuration.arduinoPort > 0 &&
        configuration.arduinoPort <= 65535,
      code: 'ARDUINO_TARGET_INVALID'
    },
    {
      name: 'arduinoApiPath',
      ok:
        configuration.arduinoApiPath
          .startsWith('/') &&
        isConfiguredSecret(
          configuration.arduinoApiPath,
          8
        ),
      code: 'ARDUINO_API_PATH_INVALID'
    },
    {
      name: 'arduinoApiKey',
      ok: isConfiguredSecret(
        configuration.arduinoApiKey,
        16
      ),
      code: 'ARDUINO_API_KEY_INVALID'
    }
  ].map((check) => (
    check.ok
      ? {
          name: check.name,
          ok: true
        }
      : check
  ));
}

async function checkRuntimeDirectory(
  name,
  directoryPath
) {
  try {
    const stats = await fs.promises.stat(
      directoryPath
    );

    if (!stats.isDirectory()) {
      return {
        name,
        ok: false,
        code: 'NOT_DIRECTORY'
      };
    }

    await fs.promises.access(
      directoryPath,
      fs.constants.R_OK | fs.constants.W_OK
    );

    return {
      name,
      ok: true
    };
  } catch (error) {
    return {
      name,
      ok: false,
      code: error.code || 'DIRECTORY_ERROR'
    };
  }
}

async function collectReadinessChecks(
  configuration
) {
  const directoryChecks = await Promise.all(
    Object.entries(configuration.directories)
      .map(([name, directoryPath]) =>
        checkRuntimeDirectory(
          name,
          directoryPath
        )
      )
  );

  return [
    ...configurationChecks(configuration),
    ...directoryChecks
  ];
}

function formatHttpHost(host) {
  const normalized = String(host || '').trim();

  if (
    normalized.includes(':') &&
    !normalized.startsWith('[') &&
    !normalized.endsWith(']')
  ) {
    return `[${normalized}]`;
  }

  return normalized;
}

function buildArduinoStatusUrl(configuration) {
  const host = formatHttpHost(
    configuration.arduinoIP
  );

  const url = new URL(
    `http://${host}:${configuration.arduinoPort}`
  );

  url.pathname =
    `${configuration.arduinoApiPath}/api/status`;

  // Átmeneti kompatibilitás a jelenlegi firmware-rel.
  // A kliens -> LXC API v2 már Bearer fejlécet használ.
  url.searchParams.set(
    'k',
    configuration.arduinoApiKey
  );

  return url.toString();
}

function arduinoConfigurationIsValid(
  configuration
) {
  return configurationChecks(configuration)
    .filter((check) =>
      check.name.startsWith('arduino')
    )
    .every((check) => check.ok);
}

function mapArduinoError(error) {
  if (error?.code === 'ECONNABORTED') {
    return HttpError.gatewayTimeout(
      'ARDUINO_TIMEOUT',
      'Az Arduino nem válaszolt a megadott időkorláton belül.',
      null,
      {
        cause: error
      }
    );
  }

  const responseStatus = error?.response?.status;

  if (
    responseStatus === 401 ||
    responseStatus === 403
  ) {
    return new HttpError(
      502,
      'ARDUINO_AUTH_FAILED',
      'Az Arduino elutasította a szerver hitelesítését.',
      {
        upstreamStatus: responseStatus
      },
      {
        cause: error
      }
    );
  }

  if (Number.isInteger(responseStatus)) {
    return new HttpError(
      502,
      'ARDUINO_BAD_RESPONSE',
      'Az Arduino hibás HTTP-választ adott.',
      {
        upstreamStatus: responseStatus
      },
      {
        cause: error
      }
    );
  }

  return HttpError.serviceUnavailable(
    'ARDUINO_UNREACHABLE',
    'Az Arduino jelenleg nem érhető el.',
    null,
    {
      cause: error
    }
  );
}

async function fetchArduinoStatus(configuration) {
  if (
    !arduinoConfigurationIsValid(
      configuration
    )
  ) {
    throw HttpError.serviceUnavailable(
      'ARDUINO_CONFIG_INVALID',
      'Az Arduino-kapcsolat konfigurációja hiányos.',
      {
        checks: configurationChecks(
          configuration
        ).filter((check) =>
          check.name.startsWith('arduino')
        )
      }
    );
  }

  const startedAt = Date.now();

  try {
    const response = await axios({
      method: 'get',
      url: buildArduinoStatusUrl(
        configuration
      ),
      timeout: configuration.arduinoTimeoutMs,
      maxRedirects: 0,
      proxy: false,
      headers: {
        Accept: 'application/json',
        'X-Request-Source':
          'arduino-led-controller-api-v2'
      }
    });

    return {
      status:
        response.data &&
        typeof response.data === 'object'
          ? response.data
          : {
              raw: response.data
            },
      latencyMs:
        Date.now() - startedAt
    };
  } catch (error) {
    throw mapArduinoError(error);
  }
}

function parseBearerToken(req) {
  const authorization = String(
    req.get?.('Authorization') ||
    req.headers?.authorization ||
    ''
  ).trim();

  const match = authorization.match(
    /^Bearer[ \t]+(.+)$/i
  );

  return match ? match[1].trim() : '';
}

function safeTokenEquals(received, expected) {
  const receivedBuffer = Buffer.from(
    String(received || ''),
    'utf8'
  );
  const expectedBuffer = Buffer.from(
    String(expected || ''),
    'utf8'
  );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function requireApiV2Auth(req, res, next) {
  const configuration =
    loadApiV2Configuration();

  if (
    !isConfiguredSecret(
      configuration.apiV2Token,
      32
    )
  ) {
    return sendError(
      req,
      res,
      HttpError.serviceUnavailable(
        'API_V2_AUTH_NOT_CONFIGURED',
        'Az API v2 hitelesítése nincs beállítva.'
      )
    );
  }

  const receivedToken = parseBearerToken(req);

  if (
    !receivedToken ||
    !safeTokenEquals(
      receivedToken,
      configuration.apiV2Token
    )
  ) {
    res.set(
      'WWW-Authenticate',
      'Bearer realm="arduino-led-controller-api-v2"'
    );

    return sendError(
      req,
      res,
      HttpError.unauthorized()
    );
  }

  return next();
}

function resolveAllowedOrigin(req, configuration) {
  const requestOrigin = String(
    req.get?.('Origin') ||
    req.headers?.origin ||
    ''
  ).trim();

  const allowedOrigins =
    configuration.apiV2AllowedOrigins.length
      ? configuration.apiV2AllowedOrigins
      : ['*'];

  if (allowedOrigins.includes('*')) {
    return '*';
  }

  if (
    requestOrigin &&
    allowedOrigins.includes(requestOrigin)
  ) {
    return requestOrigin;
  }

  return '';
}

function apiV2CorsAndSecurity(req, res, next) {
  const configuration =
    loadApiV2Configuration();

  const allowedOrigin = resolveAllowedOrigin(
    req,
    configuration
  );

  if (allowedOrigin) {
    res.set(
      'Access-Control-Allow-Origin',
      allowedOrigin
    );
  }

  if (allowedOrigin !== '*') {
    res.vary('Origin');
  }

  res.set({
    'Access-Control-Allow-Methods':
      'GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Request-ID',
    'Access-Control-Expose-Headers':
      'X-Request-ID',
    'Access-Control-Max-Age':
      '600'
  });

  setApiResponseHeaders(res);
  next();
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
}

function installApiV2Routes(app) {
  app.use(
    '/api/v2',
    apiV2RequestContext,
    apiV2CorsAndSecurity
  );

  app.options('/api/v2', (req, res) => {
    res.status(204).end();
  });

  app.options('/api/v2/*', (req, res) => {
    res.status(204).end();
  });

  app.get('/api/v2', (req, res) => {
    const configuration =
      loadApiV2Configuration();

    return sendSuccess(req, res, {
      name: SERVICE_NAME,
      version: configuration.version,
      apiVersion: API_VERSION,
      stability: 'alpha',
      authentication: {
        scheme: 'Bearer',
        header: 'Authorization',
        protectedEndpoints: [
          '/api/v2/system/status',
          '/api/v2/arduino/status'
        ]
      },
      endpoints: {
        discovery: '/api/v2',
        systemHealth:
          '/api/v2/system/health',
        systemStatus:
          '/api/v2/system/status',
        arduinoStatus:
          '/api/v2/arduino/status'
      }
    });
  });

  app.get(
    '/api/v2/system/health',
    asyncRoute(async (req, res) => {
      const configuration =
        loadApiV2Configuration();

      const checks =
        await collectReadinessChecks(
          configuration
        );

      const ready = checks.every(
        (check) => check.ok
      );

      if (!ready) {
        throw HttpError.serviceUnavailable(
          'SYSTEM_NOT_READY',
          'A rendszer még nem áll készen az API v2 kiszolgálására.',
          {
            status: 'not-ready',
            checks
          }
        );
      }

      return sendSuccess(req, res, {
        status: 'ready',
        service: SERVICE_NAME,
        version: configuration.version,
        checks
      });
    })
  );

  app.get(
    '/api/v2/system/status',
    requireApiV2Auth,
    (req, res) => {
      const configuration =
        loadApiV2Configuration();

      return sendSuccess(req, res, {
        service: {
          name: SERVICE_NAME,
          version: configuration.version,
          apiVersion: API_VERSION,
          environment:
            configuration.environment,
          nodeVersion: process.version,
          uptimeSeconds:
            Math.floor(process.uptime()),
          startedAt:
            new Date(
              SERVER_STARTED_AT
            ).toISOString()
        },
        compatibility: {
          legacyApiEnabled: true,
          healthEndpointsEnabled: true,
          apiV2Enabled: true
        }
      });
    }
  );

  app.get(
    '/api/v2/arduino/status',
    requireApiV2Auth,
    asyncRoute(async (req, res) => {
      const configuration =
        loadApiV2Configuration();

      const result =
        await fetchArduinoStatus(
          configuration
        );

      return sendSuccess(req, res, {
        connected: true,
        latencyMs: result.latencyMs,
        status: result.status
      });
    })
  );

  app.use('/api/v2', (req, res) => {
    return sendError(
      req,
      res,
      HttpError.notFound(
        'API_ROUTE_NOT_FOUND',
        'Az API v2 útvonal nem található.',
        {
          method: req.method,
          path: req.originalUrl
        }
      )
    );
  });

  app.use(
    '/api/v2',
    (error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }

      if (error instanceof HttpError) {
        return sendError(req, res, error);
      }

      return sendError(
        req,
        res,
        HttpError.internal(
          'INTERNAL_ERROR',
          'Belső szerverhiba történt.',
          null,
          {
            cause: error
          }
        )
      );
    }
  );
}

function copyExpressProperties(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (
      key === 'length' ||
      key === 'name' ||
      key === 'prototype' ||
      key === 'arguments' ||
      key === 'caller'
    ) {
      continue;
    }

    const descriptor =
      Object.getOwnPropertyDescriptor(
        source,
        key
      );

    if (!descriptor) continue;

    try {
      Object.defineProperty(
        target,
        key,
        descriptor
      );
    } catch (_) {
      // Egyes függvénytulajdonságok nem
      // definiálhatók újra minden platformon.
    }
  }

  Object.assign(target, source);
}

function installExpressApiV2Bootstrap() {
  if (globalThis[BOOTSTRAP_STATE]) return;

  const expressModulePath =
    require.resolve('express');

  const currentExpress = require(
    expressModulePath
  );

  function patchedExpress(...args) {
    const app = currentExpress(...args);

    installApiV2Routes(app);
    return app;
  }

  copyExpressProperties(
    patchedExpress,
    currentExpress
  );

  const cacheEntry =
    require.cache[expressModulePath];

  if (!cacheEntry) {
    throw new Error(
      'Az Express modul gyorsítótár-bejegyzése nem található.'
    );
  }

  cacheEntry.exports = patchedExpress;
  globalThis[BOOTSTRAP_STATE] = true;
}

module.exports = {
  installApiV2Routes,
  installExpressApiV2Bootstrap
};
