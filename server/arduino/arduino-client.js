'use strict';

const axios = require('axios');

const {
  ArduinoClientError
} = require('./arduino-error');

function normalizeApiPath(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  return normalized
    ? `/${normalized}`
    : '';
}

function normalizeEndpoint(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '');
}

function formatHttpHost(host) {
  const normalized =
    String(host || '').trim();

  if (
    normalized.includes(':') &&
    !normalized.startsWith('[') &&
    !normalized.endsWith(']')
  ) {
    return `[${normalized}]`;
  }

  return normalized;
}

function withoutDeviceKeyHeader(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers || {})
      .filter(([name]) => (
        String(name).toLowerCase() !==
          'x-device-key'
      ))
  );
}

function configuredSecret(
  value,
  minimumLength
) {
  const normalized =
    String(value || '').trim();

  return (
    normalized.length >= minimumLength &&
    !/CHANGE_THIS|CHANGEME|REPLACE_ME/i
      .test(normalized)
  );
}

function mapArduinoClientError(error) {
  if (error instanceof ArduinoClientError) {
    return error;
  }

  if (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return ArduinoClientError.timeout(error);
  }

  const upstreamStatus =
    error?.response?.status;

  if (
    upstreamStatus === 401 ||
    upstreamStatus === 403
  ) {
    return ArduinoClientError.authentication(
      upstreamStatus,
      error
    );
  }

  if (Number.isInteger(upstreamStatus)) {
    return ArduinoClientError.badResponse(
      upstreamStatus,
      error
    );
  }

  return ArduinoClientError.unreachable(
    error
  );
}

class ArduinoClient {
  constructor({
    config,
    logger = null,
    transport = axios
  } = {}) {
    this.config = Object.freeze({
      ip: String(
        config?.ip || ''
      ).trim(),
      port: Number(config?.port),
      apiPath: normalizeApiPath(
        config?.apiPath
      ),
      apiKey: String(
        config?.apiKey || ''
      ).trim(),
      timeoutMs: Number(
        config?.timeoutMs || 30000
      ),
      healthTimeoutMs: Number(
        config?.healthTimeoutMs || 2500
      )
    });

    this.logger = logger;
    this.transport = transport;

    // Az UNO R4 WiFi HTTP-kiszolgálója egyszerre egy kapcsolatot kezel
    // megbízhatóan. Minden kérés ugyanazon a soron halad át.
    this.requestQueue = Promise.resolve();
  }

  setTarget(ip, port = this.config.port) {
    const normalizedIp =
      String(ip || '').trim();
    const normalizedPort =
      Number(port);

    if (
      !normalizedIp ||
      !Number.isInteger(normalizedPort) ||
      normalizedPort < 1 ||
      normalizedPort > 65535
    ) {
      throw ArduinoClientError.configuration({
        target: {
          ip,
          port
        }
      });
    }

    this.config = Object.freeze({
      ...this.config,
      ip: normalizedIp,
      port: normalizedPort
    });

    return {
      ip:
        this.config.ip,
      port:
        this.config.port
    };
  }

  configurationChecks() {
    return [
      {
        name: 'arduinoTarget',
        ok:
          Boolean(this.config.ip) &&
          Number.isInteger(
            this.config.port
          ) &&
          this.config.port > 0 &&
          this.config.port <= 65535,
        code: 'ARDUINO_TARGET_INVALID'
      },
      {
        name: 'arduinoApiPath',
        ok:
          this.config.apiPath
            .startsWith('/') &&
          configuredSecret(
            this.config.apiPath,
            8
          ),
        code:
          'ARDUINO_API_PATH_INVALID'
      },
      {
        name: 'arduinoApiKey',
        ok: configuredSecret(
          this.config.apiKey,
          16
        ),
        code:
          'ARDUINO_API_KEY_INVALID'
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

  isConfigured() {
    return this.configurationChecks()
      .every((check) => check.ok);
  }

  assertConfigured() {
    const checks =
      this.configurationChecks();

    if (
      !checks.every(
        (check) => check.ok
      )
    ) {
      throw ArduinoClientError.configuration({
        checks
      });
    }
  }

  buildUrl(
    endpoint,
    query = {}
  ) {
    this.assertConfigured();

    const host =
      formatHttpHost(this.config.ip);

    const url = new URL(
      `http://${host}:${this.config.port}`
    );

    const normalizedEndpoint =
      normalizeEndpoint(endpoint);

    url.pathname = [
      this.config.apiPath,
      normalizedEndpoint
    ]
      .filter(Boolean)
      .join('/')
      .replace(/\/{2,}/g, '/');

    for (
      const [key, value]
      of Object.entries(query || {})
    ) {
      if (
        value === undefined ||
        value === null
      ) {
        continue;
      }

      url.searchParams.set(
        key,
        String(value)
      );
    }

    return url;
  }

  request(
    method,
    endpoint,
    options = {}
  ) {
    const execute = () =>
      this.requestDirect(
        method,
        endpoint,
        options
      );

    const queued =
      this.requestQueue.then(
        execute,
        execute
      );

    this.requestQueue =
      queued.catch(
        () => undefined
      );

    return queued;
  }

  async requestDirect(
    method,
    endpoint,
    {
      query = {},
      data,
      headers = {},
      timeoutMs,
      source =
        'arduino-led-controller'
    } = {}
  ) {
    const url =
      this.buildUrl(endpoint, query);

    const startedAt = Date.now();

    try {
      const response =
        await this.transport({
          method: String(
            method || 'get'
          ).toLowerCase(),
          url: url.toString(),
          data,
          timeout:
            Number(timeoutMs) > 0
              ? Number(timeoutMs)
              : this.config.timeoutMs,
          maxRedirects: 0,
          proxy: false,
          headers: {
            Accept: 'application/json',
            'X-Request-Source': source,
            ...withoutDeviceKeyHeader(
              headers
            ),
            // A titok nem kerülhet URL-be, proxy- vagy access logba.
            // A hívó által megadott kis- vagy nagybetűs változatot is
            // eltávolítjuk, majd a konfigurált kulcsot tesszük a kérésbe.
            'X-Device-Key':
              this.config.apiKey
          }
        });

      return {
        data: response?.data,
        statusCode:
          Number(response?.status) || 200,
        latencyMs:
          Date.now() - startedAt
      };
    } catch (error) {
      const mappedError =
        mapArduinoClientError(error);

      this.logger?.warn?.(
        'Arduino HTTP-kérés sikertelen.',
        {
          code: mappedError.code,
          endpoint:
            normalizeEndpoint(endpoint)
        }
      );

      throw mappedError;
    }
  }

  get(endpoint, options = {}) {
    return this.request(
      'get',
      endpoint,
      options
    );
  }

  post(
    endpoint,
    data,
    options = {}
  ) {
    return this.request(
      'post',
      endpoint,
      {
        ...options,
        data
      }
    );
  }

  put(
    endpoint,
    data,
    options = {}
  ) {
    return this.request(
      'put',
      endpoint,
      {
        ...options,
        data
      }
    );
  }

  delete(endpoint, options = {}) {
    return this.request(
      'delete',
      endpoint,
      options
    );
  }

  async getStatus({
    timeoutMs =
      this.config.healthTimeoutMs,
    source =
      'arduino-led-controller-status'
  } = {}) {
    const result = await this.request(
      'get',
      'api/status',
      {
        timeoutMs,
        source
      }
    );

    return {
      status:
        result.data &&
        typeof result.data === 'object'
          ? result.data
          : {
              raw: result.data
            },
      statusCode:
        result.statusCode,
      latencyMs:
        result.latencyMs
    };
  }
}

module.exports = {
  ArduinoClient,
  configuredSecret,
  formatHttpHost,
  mapArduinoClientError,
  normalizeApiPath,
  normalizeEndpoint,
  withoutDeviceKeyHeader
};
