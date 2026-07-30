'use strict';

const http = require('http');
const https = require('https');

const PATCH_STATE = Symbol.for(
  'arduino-led-controller.http-server-registry-patch'
);

function closeServer(
  server,
  {
    timeoutMs = 8000
  } = {}
) {
  if (
    !server ||
    typeof server.close !== 'function'
  ) {
    return Promise.resolve({
      closed: false,
      reason: 'INVALID_SERVER'
    });
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        server.closeAllConnections?.();
      } catch (_) {
        // A kényszerített kapcsolatzárás platformfüggő.
      }

      finish({
        closed: false,
        timedOut: true
      });
    }, Math.max(250, Number(timeoutMs) || 8000));

    timer.unref?.();

    try {
      server.closeIdleConnections?.();

      server.close((error) => {
        const alreadyClosed =
          error?.code ===
          'ERR_SERVER_NOT_RUNNING';

        finish({
          closed:
            !error ||
            alreadyClosed,
          error:
            error &&
            !alreadyClosed
              ? error.message
              : null,
          timedOut: false
        });
      });
    } catch (error) {
      finish({
        closed: false,
        error: error.message,
        timedOut: false
      });
    }
  });
}

class HttpServerRegistry {
  constructor({
    closeTimeoutMs = 8000,
    logger = null
  } = {}) {
    this.closeTimeoutMs =
      Math.max(
        250,
        Number(closeTimeoutMs) || 8000
      );
    this.logger = logger;
    this.servers = new Set();
  }

  track(server) {
    if (
      !server ||
      typeof server.close !== 'function'
    ) {
      throw new TypeError(
        'A HTTP registry csak szerverpéldányt tud követni.'
      );
    }

    this.servers.add(server);

    server.once?.(
      'close',
      () => {
        this.servers.delete(server);
      }
    );

    return server;
  }

  status() {
    return {
      trackedServers:
        this.servers.size,
      listeningServers:
        [...this.servers].filter(
          (server) =>
            server.listening === true
        ).length,
      closeTimeoutMs:
        this.closeTimeoutMs
    };
  }

  async closeAll() {
    const servers =
      [...this.servers];

    const results =
      await Promise.all(
        servers.map(
          async (server, index) => ({
            index,
            ...await closeServer(
              server,
              {
                timeoutMs:
                  this.closeTimeoutMs
              }
            )
          })
        )
      );

    this.servers.clear();

    const failures =
      results.filter(
        (result) =>
          result.closed !== true
      );

    if (failures.length > 0) {
      this.logger?.warn?.(
        'Nem minden HTTP szerver záródott le szabályosan.',
        {
          failures
        }
      );
    }

    return {
      total:
        results.length,
      closed:
        results.length -
        failures.length,
      failures,
      results
    };
  }
}

function installHttpServerRegistryPatch(
  registry
) {
  if (
    !registry ||
    typeof registry.track !== 'function'
  ) {
    throw new TypeError(
      'A HTTP patch számára HttpServerRegistry szükséges.'
    );
  }

  if (globalThis[PATCH_STATE]) {
    return globalThis[PATCH_STATE];
  }

  const originals = {
    http:
      http.createServer,
    https:
      https.createServer
  };

  http.createServer =
    function patchedHttpCreateServer(
      ...args
    ) {
      return registry.track(
        originals.http.apply(
          this,
          args
        )
      );
    };

  https.createServer =
    function patchedHttpsCreateServer(
      ...args
    ) {
      return registry.track(
        originals.https.apply(
          this,
          args
        )
      );
    };

  const state = {
    registry,
    uninstall() {
      http.createServer =
        originals.http;
      https.createServer =
        originals.https;
      delete globalThis[PATCH_STATE];
    }
  };

  globalThis[PATCH_STATE] =
    state;

  return state;
}

function resetHttpServerRegistryPatchForTests() {
  globalThis[PATCH_STATE]
    ?.uninstall?.();
}

module.exports = {
  HttpServerRegistry,
  closeServer,
  installHttpServerRegistryPatch,
  resetHttpServerRegistryPatchForTests
};
