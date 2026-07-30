'use strict';

const fs = require('fs-extra');

const {
  ArduinoClientError
} = require('./arduino/arduino-error');

const {
  getRuntimeContext
} = require('./core/runtime-context');

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

function healthBase(
  runtime,
  status,
  ok
) {
  return {
    ok,
    status,
    service:
      runtime.config.service.name,
    version:
      runtime.config.service.version,
    uptimeSeconds:
      Math.floor(process.uptime()),
    startedAt:
      runtimeStartedAt(runtime),
    lifecycle:
      runtime.lifecycle
        ?.snapshot?.() ||
      null,
    timestamp:
      new Date().toISOString()
  };
}

function setHealthHeaders(res) {
  res.set({
    'Cache-Control':
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Content-Type-Options': 'nosniff'
  });
}

async function checkRuntimeDirectory(
  name,
  directoryPath
) {
  try {
    const stats = await fs.stat(
      directoryPath
    );

    if (!stats.isDirectory()) {
      return {
        name,
        ok: false,
        code: 'NOT_DIRECTORY'
      };
    }

    await fs.access(
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

function runtimeDirectories(runtime) {
  return {
    dataDir:
      runtime.paths.dataDir,
    configDir:
      runtime.paths.configDir,
    schedulesDir:
      runtime.paths.schedulesDir,
    firmwareDir:
      runtime.paths.firmwareDir,
    eventArchiveDir:
      runtime.paths.eventArchiveDir
  };
}

async function collectReadinessChecks(
  runtime
) {
  const arduinoChecks =
    runtime.arduinoClient
      .configurationChecks();

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

  const lifecycleCheck = {
    name: 'lifecycle',
    ok:
      runtime.lifecycle
        ?.isReady?.() !== false,
    code:
      'SERVICE_DRAINING'
  };

  return [
    lifecycleCheck.ok
      ? {
          name:
            lifecycleCheck.name,
          ok: true
        }
      : lifecycleCheck,
    ...arduinoChecks,
    ...directoryChecks
  ];
}

function arduinoHealthErrorCode(error) {
  if (error instanceof ArduinoClientError) {
    return error.code;
  }

  if (
    error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return 'ARDUINO_UNREACHABLE';
}

function installHealthRoutes(app) {
  app.get(
    '/health/live',
    (req, res) => {
      const runtime =
        getRuntimeContext();

      setHealthHeaders(res);

      res.status(200).json(
        healthBase(
          runtime,
          'live',
          true
        )
      );
    }
  );

  app.get(
    '/health/ready',
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

      setHealthHeaders(res);

      res.status(
        ready ? 200 : 503
      ).json({
        ...healthBase(
          runtime,
          ready
            ? 'ready'
            : 'not-ready',
          ready
        ),
        checks
      });
    }
  );

  app.get(
    '/health/arduino',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        const result =
          await runtime.arduinoClient
            .getStatus({
              timeoutMs:
                runtime.config.arduino
                  .healthTimeoutMs,
              source:
                'arduino-led-controller-health'
            });

        const status =
          result.status &&
          typeof result.status === 'object'
            ? result.status
            : {};

        setHealthHeaders(res);

        res.status(200).json({
          ...healthBase(
            runtime,
            'healthy',
            true
          ),
          latencyMs:
            result.latencyMs,
          firmwareVersion:
            status.firmwareVersion ||
            status.version ||
            null
        });
      } catch (error) {
        setHealthHeaders(res);

        res.status(503).json({
          ...healthBase(
            runtime,
            'unreachable',
            false
          ),
          code:
            arduinoHealthErrorCode(
              error
            )
        });
      }
    }
  );
}

module.exports = {
  collectReadinessChecks,
  installHealthRoutes
};
