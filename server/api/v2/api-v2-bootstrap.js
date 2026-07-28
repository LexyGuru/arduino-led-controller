'use strict';

const crypto = require('crypto');
const fs = require('fs');

const {
  ArduinoClientError
} = require('../../arduino/arduino-error');

const {
  isConfiguredSecret
} = require('../../core/config');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  HttpError
} = require('./http-error');

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

function runtimeStartedAt(runtime) {
  const value = runtime.startedAt;

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function apiConfigurationChecks(
  runtime
) {
  const tokenCheck = {
    name: 'apiV2Token',
    ok: isConfiguredSecret(
      runtime.config.apiV2.token,
      32
    ),
    code:
      'API_V2_TOKEN_INVALID'
  };

  const normalizedTokenCheck =
    tokenCheck.ok
      ? {
          name:
            tokenCheck.name,
          ok: true
        }
      : tokenCheck;

  return [
    normalizedTokenCheck,
    ...runtime.arduinoClient
      .configurationChecks()
  ];
}

function runtimeDirectories(runtime) {
  return {
    dataDir:
      runtime.paths.dataDir,
    configDir:
      runtime.paths.configDir,
    schedulesDir:
      runtime.paths.schedulesDir,
    firmwareDir:
      runtime.paths.firmwareDir
  };
}

async function checkRuntimeDirectory(
  name,
  directoryPath
) {
  try {
    const stats =
      await fs.promises.stat(
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
      fs.constants.R_OK |
      fs.constants.W_OK
    );

    return {
      name,
      ok: true
    };
  } catch (error) {
    return {
      name,
      ok: false,
      code:
        error.code ||
        'DIRECTORY_ERROR'
    };
  }
}

async function collectReadinessChecks(
  runtime
) {
  const directoryChecks =
    await Promise.all(
      Object.entries(
        runtimeDirectories(runtime)
      ).map(
        ([name, directoryPath]) =>
          checkRuntimeDirectory(
            name,
            directoryPath
          )
      )
    );

  return [
    ...apiConfigurationChecks(
      runtime
    ),
    ...directoryChecks
  ];
}

function mapArduinoClientError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    error instanceof
    ArduinoClientError
  ) {
    const details =
      error.details ||
      (
        error.upstreamStatus
          ? {
              upstreamStatus:
                error.upstreamStatus
            }
          : null
      );

    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      details,
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

function parseBearerToken(req) {
  const authorization = String(
    req.get?.('Authorization') ||
    req.headers?.authorization ||
    ''
  ).trim();

  const match =
    authorization.match(
      /^Bearer[ \t]+(.+)$/i
    );

  return match
    ? match[1].trim()
    : '';
}

function safeTokenEquals(
  received,
  expected
) {
  const receivedBuffer =
    Buffer.from(
      String(received || ''),
      'utf8'
    );

  const expectedBuffer =
    Buffer.from(
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

function requireApiV2Auth(
  req,
  res,
  next
) {
  const runtime =
    getRuntimeContext();

  const expectedToken =
    runtime.config.apiV2.token;

  if (
    !isConfiguredSecret(
      expectedToken,
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

  const receivedToken =
    parseBearerToken(req);

  if (
    !receivedToken ||
    !safeTokenEquals(
      receivedToken,
      expectedToken
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

function resolveAllowedOrigin(
  req,
  allowedOrigins
) {
  const requestOrigin = String(
    req.get?.('Origin') ||
    req.headers?.origin ||
    ''
  ).trim();

  const normalizedOrigins =
    Array.isArray(allowedOrigins) &&
    allowedOrigins.length
      ? allowedOrigins
      : ['*'];

  if (
    normalizedOrigins.includes('*')
  ) {
    return '*';
  }

  if (
    requestOrigin &&
    normalizedOrigins.includes(
      requestOrigin
    )
  ) {
    return requestOrigin;
  }

  return '';
}

function apiV2CorsAndSecurity(
  req,
  res,
  next
) {
  const runtime =
    getRuntimeContext();

  const allowedOrigin =
    resolveAllowedOrigin(
      req,
      runtime.config.apiV2
        .allowedOrigins
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

  app.options(
    '/api/v2',
    (req, res) => {
      res.status(204).end();
    }
  );

  app.options(
    '/api/v2/*',
    (req, res) => {
      res.status(204).end();
    }
  );

  app.get(
    '/api/v2',
    (req, res) => {
      const runtime =
        getRuntimeContext();

      return sendSuccess(
        req,
        res,
        {
          name:
            runtime.config.service.name,
          version:
            runtime.config.service.version,
          apiVersion:
            API_VERSION,
          stability:
            'alpha',
          authentication: {
            scheme: 'Bearer',
            header:
              'Authorization',
            protectedEndpoints: [
              '/api/v2/system/status',
              '/api/v2/arduino/status'
            ]
          },
          endpoints: {
            discovery:
              '/api/v2',
            systemHealth:
              '/api/v2/system/health',
            systemStatus:
              '/api/v2/system/status',
            arduinoStatus:
              '/api/v2/arduino/status'
          }
        }
      );
    }
  );

  app.get(
    '/api/v2/system/health',
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        const checks =
          await collectReadinessChecks(
            runtime
          );

        const ready =
          checks.every(
            (check) => check.ok
          );

        if (!ready) {
          throw HttpError
            .serviceUnavailable(
              'SYSTEM_NOT_READY',
              'A rendszer még nem áll készen az API v2 kiszolgálására.',
              {
                status:
                  'not-ready',
                checks
              }
            );
        }

        return sendSuccess(
          req,
          res,
          {
            status: 'ready',
            service:
              runtime.config.service.name,
            version:
              runtime.config.service.version,
            checks
          }
        );
      }
    )
  );

  app.get(
    '/api/v2/system/status',
    requireApiV2Auth,
    (req, res) => {
      const runtime =
        getRuntimeContext();

      return sendSuccess(
        req,
        res,
        {
          service: {
            name:
              runtime.config.service.name,
            version:
              runtime.config.service.version,
            apiVersion:
              API_VERSION,
            environment:
              runtime.config.service
                .environment,
            nodeVersion:
              process.version,
            uptimeSeconds:
              Math.floor(
                process.uptime()
              ),
            startedAt:
              runtimeStartedAt(
                runtime
              )
          },
          compatibility: {
            legacyApiEnabled:
              true,
            healthEndpointsEnabled:
              true,
            apiV2Enabled:
              true
          }
        }
      );
    }
  );

  app.get(
    '/api/v2/arduino/status',
    requireApiV2Auth,
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        let result;

        try {
          result =
            await runtime.arduinoClient
              .getStatus({
                timeoutMs:
                  runtime.config.arduino
                    .healthTimeoutMs,
                source:
                  'arduino-led-controller-api-v2'
              });
        } catch (error) {
          throw mapArduinoClientError(
            error
          );
        }

        return sendSuccess(
          req,
          res,
          {
            connected: true,
            latencyMs:
              result.latencyMs,
            status:
              result.status
          }
        );
      }
    )
  );

  app.use(
    '/api/v2',
    (req, res) => {
      return sendError(
        req,
        res,
        HttpError.notFound(
          'API_ROUTE_NOT_FOUND',
          'Az API v2 útvonal nem található.',
          {
            method:
              req.method,
            path:
              req.originalUrl
          }
        )
      );
    }
  );

  app.use(
    '/api/v2',
    (
      error,
      req,
      res,
      next
    ) => {
      if (res.headersSent) {
        return next(error);
      }

      if (
        error instanceof HttpError
      ) {
        return sendError(
          req,
          res,
          error
        );
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

function copyExpressProperties(
  target,
  source
) {
  for (
    const key
    of Reflect.ownKeys(source)
  ) {
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
      // Egyes függvénytulajdonságok
      // nem definiálhatók újra.
    }
  }

  Object.assign(
    target,
    source
  );
}

function installExpressApiV2Bootstrap() {
  if (globalThis[BOOTSTRAP_STATE]) {
    return;
  }

  const expressModulePath =
    require.resolve('express');

  const currentExpress =
    require(expressModulePath);

  function patchedExpress(...args) {
    const app =
      currentExpress(...args);

    installApiV2Routes(app);

    return app;
  }

  copyExpressProperties(
    patchedExpress,
    currentExpress
  );

  const cacheEntry =
    require.cache[
      expressModulePath
    ];

  if (!cacheEntry) {
    throw new Error(
      'Az Express modul gyorsítótár-bejegyzése nem található.'
    );
  }

  cacheEntry.exports =
    patchedExpress;

  globalThis[BOOTSTRAP_STATE] =
    true;
}

module.exports = {
  apiConfigurationChecks,
  collectReadinessChecks,
  installApiV2Routes,
  installExpressApiV2Bootstrap,
  mapArduinoClientError
};
