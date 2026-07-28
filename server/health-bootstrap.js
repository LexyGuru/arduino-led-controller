'use strict';

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const BOOTSTRAP_STATE = Symbol.for(
  'arduino-led-controller.health-bootstrap-installed'
);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_STARTED_AT = Date.now();

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readJsonSync(filePath);
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

function numberInRange(value, fallback, minimum, maximum) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
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
    !/CHANGE_THIS|CHANGEME|REPLACE_ME/i.test(normalized);
}

function loadHealthConfiguration() {
  const configDir = process.env.CONFIG_DIR ||
    path.join(PROJECT_ROOT, 'config');

  const runtimeSettings = readJsonFile(
    path.join(configDir, 'server-settings.json')
  ) || {};

  const environmentPort = Number(process.env.ARDUINO_PORT);
  const runtimePort = Number(runtimeSettings.arduinoPort);

  let arduinoPort = Number.isInteger(environmentPort)
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
    arduinoIP,
    arduinoPort,
    arduinoApiPath: normalizePrivatePath(
      process.env.ARDUINO_API_PATH
    ),
    arduinoApiKey: String(
      process.env.ARDUINO_API_KEY || ''
    ).trim(),
    arduinoHealthTimeoutMs: numberInRange(
      process.env.ARDUINO_HEALTH_TIMEOUT_MS,
      2500,
      500,
      10000
    ),
    directories: {
      dataDir: process.env.DATA_DIR ||
        path.join(PROJECT_ROOT, 'data'),
      configDir,
      schedulesDir: process.env.SCHEDULES_DIR ||
        path.join(PROJECT_ROOT, 'schedules'),
      firmwareDir: process.env.FIRMWARE_DIR ||
        path.join(PROJECT_ROOT, 'data', 'firmware')
    }
  };
}

function healthBase(status, ok, version) {
  return {
    ok,
    status,
    service: 'arduino-led-controller',
    version,
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date(SERVER_STARTED_AT).toISOString(),
    timestamp: new Date().toISOString()
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

async function checkRuntimeDirectory(name, directoryPath) {
  try {
    const stats = await fs.stat(directoryPath);

    if (!stats.isDirectory()) {
      return {
        name,
        ok: false,
        code: 'NOT_DIRECTORY'
      };
    }

    await fs.access(
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
  const host = formatHttpHost(configuration.arduinoIP);
  const url = new URL(
    `http://${host}:${configuration.arduinoPort}`
  );

  url.pathname =
    `${configuration.arduinoApiPath}/api/status`;
  url.searchParams.set('k', configuration.arduinoApiKey);

  return url.toString();
}

function configurationChecks(configuration) {
  return [
    {
      name: 'arduinoTarget',
      ok: Boolean(configuration.arduinoIP) &&
        Number.isInteger(configuration.arduinoPort) &&
        configuration.arduinoPort > 0 &&
        configuration.arduinoPort <= 65535
    },
    {
      name: 'arduinoApiPath',
      ok: configuration.arduinoApiPath.startsWith('/') &&
        isConfiguredSecret(
          configuration.arduinoApiPath,
          8
        )
    },
    {
      name: 'arduinoApiKey',
      ok: isConfiguredSecret(
        configuration.arduinoApiKey,
        16
      )
    }
  ];
}

function sanitizeArduinoError(error) {
  if (error && typeof error.code === 'string') {
    return error.code;
  }

  const status = error?.response?.status;
  if (Number.isInteger(status)) {
    return `HTTP_${status}`;
  }

  return 'ARDUINO_UNREACHABLE';
}

async function checkArduino(configuration) {
  const checks = configurationChecks(configuration);

  if (!checks.every((check) => check.ok)) {
    const error = new Error(
      'Az Arduino health ellenőrzés konfigurációja hiányos.'
    );
    error.code = 'ARDUINO_CONFIG_INVALID';
    throw error;
  }

  const startedAt = Date.now();
  const response = await axios({
    method: 'get',
    url: buildArduinoStatusUrl(configuration),
    timeout: configuration.arduinoHealthTimeoutMs,
    maxRedirects: 0,
    proxy: false,
    headers: {
      Accept: 'application/json',
      'X-Health-Check': 'arduino-led-controller'
    }
  });

  return {
    data: response.data,
    latencyMs: Date.now() - startedAt
  };
}

function installHealthRoutes(app) {
  app.get('/health/live', (req, res) => {
    const configuration = loadHealthConfiguration();

    setHealthHeaders(res);
    res.status(200).json(
      healthBase('live', true, configuration.version)
    );
  });

  app.get('/health/ready', async (req, res) => {
    const configuration = loadHealthConfiguration();
    const checks = configurationChecks(configuration);

    const directoryChecks = await Promise.all(
      Object.entries(configuration.directories)
        .map(([name, directoryPath]) =>
          checkRuntimeDirectory(name, directoryPath)
        )
    );

    const allChecks = [...checks, ...directoryChecks];
    const ready = allChecks.every((check) => check.ok);

    setHealthHeaders(res);
    res.status(ready ? 200 : 503).json({
      ...healthBase(
        ready ? 'ready' : 'not-ready',
        ready,
        configuration.version
      ),
      checks: allChecks
    });
  });

  app.get('/health/arduino', async (req, res) => {
    const configuration = loadHealthConfiguration();

    try {
      const result = await checkArduino(configuration);
      const status =
        result.data && typeof result.data === 'object'
          ? result.data
          : {};

      setHealthHeaders(res);
      res.status(200).json({
        ...healthBase(
          'healthy',
          true,
          configuration.version
        ),
        latencyMs: result.latencyMs,
        firmwareVersion:
          status.firmwareVersion ||
          status.version ||
          null
      });
    } catch (error) {
      setHealthHeaders(res);
      res.status(503).json({
        ...healthBase(
          'unreachable',
          false,
          configuration.version
        ),
        code: sanitizeArduinoError(error)
      });
    }
  });
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

    const descriptor = Object.getOwnPropertyDescriptor(
      source,
      key
    );

    if (!descriptor) continue;

    try {
      Object.defineProperty(target, key, descriptor);
    } catch (_) {
      // Egyes futtatókörnyezetekben néhány függvénytulajdonság
      // nem definiálható újra. Az Express publikus segédfüggvényei
      // ettől még az enumerable másolással elérhetők maradnak.
    }
  }

  Object.assign(target, source);
}

function installExpressHealthBootstrap() {
  if (globalThis[BOOTSTRAP_STATE]) return;

  const expressModulePath = require.resolve('express');
  const originalExpress = require(expressModulePath);

  function patchedExpress(...args) {
    const app = originalExpress(...args);
    installHealthRoutes(app);
    return app;
  }

  copyExpressProperties(patchedExpress, originalExpress);

  const cacheEntry = require.cache[expressModulePath];
  if (!cacheEntry) {
    throw new Error(
      'Az Express modul gyorsítótár-bejegyzése nem található.'
    );
  }

  cacheEntry.exports = patchedExpress;
  globalThis[BOOTSTRAP_STATE] = true;
}

module.exports = {
  installExpressHealthBootstrap
};
