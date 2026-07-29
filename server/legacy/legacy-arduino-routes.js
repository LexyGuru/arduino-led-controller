'use strict';

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  sendLegacyError,
  unwrapArduinoResult
} = require(
  './legacy-response'
);

function installLegacyArduinoRoutes(
  app
) {
  const read = (
    route,
    endpoint,
    {
      code =
        'ARDUINO_TIMEOUT'
    } = {}
  ) => {
    app.get(
      route,
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        try {
          const result =
            await runtime
              .arduinoClient
              .get(
                endpoint,
                {
                  source:
                    'legacy-api-adapter'
                }
              );

          return res.json(
            result.data
          );
        } catch (error) {
          return sendLegacyError(
            res,
            error,
            {
              fallbackCode:
                code,
              fallbackStatus:
                502,
              timestamp:
                true
            }
          );
        }
      }
    );
  };

  const command = (
    route,
    operation,
    {
      errorCode =
        'ARDUINO_TIMEOUT'
    } = {}
  ) => {
    app.post(
      route,
      async (req, res) => {
        try {
          return res.json(
            unwrapArduinoResult(
              await operation(
                getRuntimeContext(),
                req
              )
            )
          );
        } catch (error) {
          return sendLegacyError(
            res,
            error,
            {
              fallbackCode:
                errorCode,
              fallbackStatus:
                502,
              timestamp:
                true
            }
          );
        }
      }
    );
  };

  app.get(
    '/api/arduino/status',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      const monitor =
        runtime
          .arduinoStatusMonitor;

      const monitored =
        monitor &&
        typeof monitor.getStatus ===
          'function'
          ? monitor.getStatus()
          : null;

      if (
        monitored?.connected &&
        monitored.status
      ) {
        return res.json(
          monitored.status
        );
      }

      try {
        if (
          monitor &&
          typeof monitor.poll ===
            'function'
        ) {
          const refreshed =
            await monitor.poll();

          if (
            refreshed?.connected &&
            refreshed.status
          ) {
            return res.json(
              refreshed.status
            );
          }
        }

        const direct =
          await runtime
            .arduinoClient
            .get(
              'api/status',
              {
                source:
                  'legacy-api-adapter'
              }
            );

        return res.json(
          direct.data
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              'ARDUINO_TIMEOUT',
            fallbackStatus:
              502,
            timestamp:
              true
          }
        );
      }
    }
  );
  read(
    '/api/arduino/config',
    'api/config'
  );
  read(
    '/api/arduino/memory',
    'api/memory'
  );
  app.get(
    '/api/arduino/console/logs',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        if (
          runtime
            .arduinoConsoleService &&
          typeof runtime
            .arduinoConsoleService
            .refresh === 'function'
        ) {
          return res.json(
            await runtime
              .arduinoConsoleService
              .refresh({
                force:
                  req.query?.refresh === '1' ||
                  req.query?.force === '1'
              })
          );
        }

        const result =
          await runtime
            .arduinoClient
            .get(
              'api/console/logs',
              {
                query: {
                  after:
                    req.query?.after ||
                    0
                },
                source:
                  'legacy-api-console-logs'
              }
            );

        return res.json(
          result.data
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              'ARDUINO_CONSOLE_ERROR',
            fallbackStatus:
              502,
            timestamp:
              true
          }
        );
      }
    }
  );

  app.get(
    '/api/arduino/console/stats',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        if (
          runtime
            .arduinoConsoleService &&
          typeof runtime
            .arduinoConsoleService
            .getStats === 'function'
        ) {
          const result =
            await runtime
              .arduinoConsoleService
              .getStats();

          return res.json({
            ...(
              result.arduino &&
              typeof result.arduino ===
                'object'
                ? result.arduino
                : {}
            ),
            cache:
              result.cache
          });
        }

        const direct =
          await runtime
            .arduinoClient
            .get(
              'api/console/stats',
              {
                source:
                  'legacy-api-console-stats'
              }
            );

        return res.json(
          direct.data
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              'ARDUINO_CONSOLE_ERROR',
            fallbackStatus:
              502
          }
        );
      }
    }
  );
  read(
    '/api/arduino/schedules/files',
    'api/schedule/files'
  );
  read(
    '/api/arduino/schedules/status',
    'api/schedule/status'
  );
  read(
    '/api/arduino/schedules/debug',
    'api/schedule/debug'
  );

  app.get(
    '/api/arduino/leds',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .ledService
            .getAllStatus();

        return res.json(
          result.raw
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              'ARDUINO_TIMEOUT',
            fallbackStatus:
              502,
            timestamp:
              true
          }
        );
      }
    }
  );

  app.get(
    '/api/arduino/schedules/day/:day',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .scheduleService
            .getDay(
              req.params.day
            );

        return res.json(
          result.arduino
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              error.statusCode === 400
                ? 'INVALID_DAY'
                : 'ARDUINO_TIMEOUT',
            fallbackStatus:
              error.statusCode === 400
                ? 400
                : 502
          }
        );
      }
    }
  );

  app.get(
    '/api/arduino/schedules/file/:filename',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .scheduleService
            .getFile(
              req.params.filename
            );

        return res.json(
          result.arduino
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              error.statusCode === 400
                ? 'INVALID_FILENAME'
                : 'ARDUINO_TIMEOUT',
            fallbackStatus:
              error.statusCode === 400
                ? 400
                : 502
          }
        );
      }
    }
  );

  command(
    '/api/arduino/restart',
    async (runtime) => {
      const result =
        await runtime
          .arduinoClient
          .get(
            'api/restart',
            {
              source:
                'legacy-api-restart'
            }
          );

      runtime.eventBus
        ?.publish?.(
          'arduino.restarting',
          {
            latencyMs:
              result.latencyMs
          }
        );

      return result.data;
    }
  );

  command(
    '/api/arduino/leds/reset',
    (runtime) =>
      runtime
        .ledService
        .reset()
  );

  command(
    '/api/arduino/leds/debug',
    async (runtime) => {
      const result =
        await runtime
          .arduinoClient
          .get(
            'api/led/debug',
            {
              source:
                'legacy-api-led-debug'
            }
          );

      runtime.eventBus
        ?.publish?.(
          'led.debug',
          {
            latencyMs:
              result.latencyMs
          }
        );

      return result.data;
    }
  );

  command(
    '/api/arduino/console/clear',
    async (runtime) => {
      if (
        runtime
          .arduinoConsoleService &&
        typeof runtime
          .arduinoConsoleService
          .clear === 'function'
      ) {
        const result =
          await runtime
            .arduinoConsoleService
            .clear();

        return result.arduino;
      }

      const direct =
        await runtime
          .arduinoClient
          .get(
            'api/console/clear',
            {
              source:
                'legacy-api-console-clear'
            }
          );

      return direct.data;
    },
    {
      errorCode:
        'ARDUINO_CONSOLE_ERROR'
    }
  );

  command(
    '/api/arduino/schedules/reload',
    (runtime) =>
      runtime
        .scheduleService
        .reload()
  );

  command(
    '/api/arduino/schedules/generate',
    (runtime) =>
      runtime
        .scheduleService
        .generate()
  );

  app.delete(
    '/api/arduino/schedules',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .scheduleService
            .clear();

        return res.json(
          result.arduino
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              'ARDUINO_TIMEOUT',
            fallbackStatus:
              502,
            timestamp:
              true
          }
        );
      }
    }
  );

  app.post(
    '/api/arduino/led/:id',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .ledService
            .updateStrip(
              req.params.id,
              req.body
            );

        return res.json(
          result.arduino
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              error.statusCode === 400
                ? 'INVALID_LED_COMMAND'
                : 'LED_CONTROL_ERROR',
            fallbackStatus:
              error.statusCode === 400
                ? 400
                : 502
          }
        );
      }
    }
  );

  command(
    '/api/arduino/all-on',
    (runtime) =>
      runtime
        .ledService
        .setAllEnabled(true)
  );

  command(
    '/api/arduino/all-off',
    (runtime) =>
      runtime
        .ledService
        .setAllEnabled(false)
  );

  app.post(
    '/api/arduino/schedules/test',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .scheduleService
            .test(
              req.body?.time
            );

        return res.json(
          result.arduino
        );
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackCode:
              error.statusCode === 400
                ? 'INVALID_TIME'
                : 'ARDUINO_TIMEOUT',
            fallbackStatus:
              error.statusCode === 400
                ? 400
                : 502
          }
        );
      }
    }
  );
}

module.exports = {
  installLegacyArduinoRoutes
};
