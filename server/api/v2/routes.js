'use strict';

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  API_VERSION,
  sendSuccess
} = require('./http-response');

const {
  HttpError
} = require('./http-error');

const {
  mapArduinoClientError
} = require('./arduino-error-mapper');

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
}

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

function createApiV2Handlers({
  runtimeProvider = getRuntimeContext,
  readinessCollector
} = {}) {
  if (
    typeof readinessCollector !==
    'function'
  ) {
    throw new TypeError(
      'Az API v2 readiness collector kötelező.'
    );
  }

  return {
    discovery(req, res) {
      const runtime =
        runtimeProvider();

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
              '/api/v2/arduino/status',
              '/api/v2/leds',
              '/api/v2/leds/:id',
              '/api/v2/leds/actions/all-on',
              '/api/v2/leds/actions/all-off',
              '/api/v2/leds/actions/reset'
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
              '/api/v2/arduino/status',
            leds:
              '/api/v2/leds',
            led:
              '/api/v2/leds/:id',
            ledAllOn:
              '/api/v2/leds/actions/all-on',
            ledAllOff:
              '/api/v2/leds/actions/all-off',
            ledReset:
              '/api/v2/leds/actions/reset'
          }
        }
      );
    },

    systemHealth: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

        const checks =
          await readinessCollector(
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
    ),

    systemStatus(req, res) {
      const runtime =
        runtimeProvider();

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
          principal:
            req.apiPrincipal
              ? {
                  role:
                    req.apiPrincipal.role,
                  permissions:
                    req.apiPrincipal
                      .permissions
                }
              : null,
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
    },

    arduinoStatus: asyncRoute(
      async (req, res) => {
        const runtime =
          runtimeProvider();

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
  };
}

module.exports = {
  asyncRoute,
  createApiV2Handlers,
  runtimeStartedAt
};
