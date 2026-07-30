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

const {
  resolveApiTokenStore
} = require('./auth');

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
            schemes: [
              'Bearer',
              'led_session'
            ],
            roles: [
              'admin',
              'operator',
              'viewer'
            ],
            configuredTokens:
              resolveApiTokenStore(
                runtime
              )
                .publicSummary()
                .filter(
                  (entry) =>
                    entry.enabled
                ).length,
            sessionAvailable:
              Boolean(
                runtime.sessionService
              )
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
            schedules:
              '/api/v2/schedules',
            localSchedules:
              '/api/v2/local-schedules',
            firmwareStatus:
              '/api/v2/firmware/status',
            arduinoConsole:
              '/api/v2/arduino/console/logs',
            arduinoMonitor:
              '/api/v2/arduino/monitor',
            scheduleFiles:
              '/api/v2/files/schedules',
            cutover:
              '/api/v2/system/cutover',
            webStatus:
              '/api/v2/web/status',
            authStatus:
              '/api/v2/auth/status',
            eventStatus:
              '/api/v2/events/status',
            recentEvents:
              '/api/v2/events/recent',
            users:
              '/api/v2/users',
            csrf:
              '/api/v2/auth/csrf',
            metrics:
              '/api/v2/metrics',
            diagnostics:
              '/api/v2/diagnostics',
            audit:
              '/api/v2/audit/recent',
            openApi:
              '/api/v2/openapi.json',
            docs:
              '/api/v2/docs'
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
                  subject:
                    req.apiPrincipal
                      .subject,
                  type:
                    req.apiPrincipal
                      .type,
                  role:
                    req.apiPrincipal
                      .role,
                  permissions:
                    req.apiPrincipal
                      .permissions
                }
              : null,
          localScheduleRunner:
            runtime.localScheduleRunner
              .getStatus(),
          firmware: {
            state:
              runtime.firmwareService
                .state.state
          },
          lifecycle:
            runtime.lifecycle
              ?.snapshot?.() ||
            null,
          realtime: {
            eventBus:
              runtime.eventBus
                .stats(),
            socket:
              runtime.socketGateway
                .getStatus()
          },
          observability: {
            metrics:
              runtime.metrics
                ?.snapshot?.() ||
              null,
            persistentEvents:
              Boolean(
                runtime.eventStore
              ),
            audit:
              Boolean(
                runtime.auditLog
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
