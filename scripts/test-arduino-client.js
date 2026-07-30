'use strict';

const assert = require('assert');

const {
  ArduinoClient
} = require(
  '../server/arduino/arduino-client'
);

const {
  ArduinoClientError
} = require(
  '../server/arduino/arduino-error'
);

const {
  clearRuntimeContextForTests,
  getOptionalRuntimeContext,
  getRuntimeContext,
  setRuntimeContext
} = require(
  '../server/core/runtime-context'
);

function createConfig(overrides = {}) {
  return {
    ip: '127.0.0.1',
    port: 8080,
    apiPath:
      '/arduino-private-test-path',
    apiKey:
      'arduino-client-test-secret-123456',
    timeoutMs: 5000,
    healthTimeoutMs: 600,
    ...overrides
  };
}

async function main() {
  const requests = [];

  const successTransport =
    async (request) => {
      requests.push(request);

      return {
        status: 200,
        data: {
          success: true,
          firmwareVersion: 'test'
        }
      };
    };

  const client = new ArduinoClient({
    config: createConfig(),
    transport: successTransport
  });

  assert.strictEqual(
    client.isConfigured(),
    true
  );

  assert.strictEqual(
    client.config.timeoutMs,
    30000
  );

  assert.strictEqual(
    client.config.healthTimeoutMs,
    30000
  );

  const builtUrl = client.buildUrl(
    '/api/status',
    {
      verbose: 1
    }
  );

  assert.strictEqual(
    builtUrl.pathname,
    '/arduino-private-test-path/api/status'
  );

  assert.strictEqual(
    builtUrl.searchParams.has('k'),
    false
  );

  assert.strictEqual(
    builtUrl.toString().includes(
      'arduino-client-test-secret-123456'
    ),
    false
  );

  assert.strictEqual(
    builtUrl.searchParams.get('verbose'),
    '1'
  );

  const status =
    await client.getStatus({
      source: 'unit-test'
    });

  assert.strictEqual(
    status.status.firmwareVersion,
    'test'
  );

  assert.strictEqual(
    requests.length,
    1
  );

  assert.strictEqual(
    requests[0].method,
    'get'
  );

  assert.strictEqual(
    requests[0].headers[
      'X-Request-Source'
    ],
    'unit-test'
  );

  assert.strictEqual(
    requests[0].timeout,
    30000
  );

  assert.strictEqual(
    requests[0].headers[
      'X-Device-Key'
    ],
    'arduino-client-test-secret-123456'
  );

  assert.strictEqual(
    requests[0].url.includes(
      'arduino-client-test-secret-123456'
    ),
    false
  );

  await client.get(
    'api/status',
    {
      headers: {
        'X-Device-Key':
          'caller-must-not-override-secret',
        'x-device-key':
          'lowercase-caller-must-not-survive'
      }
    }
  );

  assert.strictEqual(
    requests[1].headers[
      'X-Device-Key'
    ],
    'arduino-client-test-secret-123456'
  );

  assert.strictEqual(
    Object.keys(requests[1].headers)
      .filter((name) => (
        name.toLowerCase() ===
          'x-device-key'
      )).length,
    1
  );

  const invalidClient =
    new ArduinoClient({
      config: createConfig({
        apiKey: 'CHANGE_THIS'
      }),
      transport: successTransport
    });

  await assert.rejects(
    () => invalidClient.getStatus(),
    (error) => (
      error instanceof ArduinoClientError &&
      error.code ===
        'ARDUINO_CONFIG_INVALID' &&
      error.statusCode === 503
    )
  );

  const timeoutClient =
    new ArduinoClient({
      config: createConfig(),
      transport: async () => {
        const error =
          new Error('timeout');
        error.code = 'ECONNABORTED';
        throw error;
      }
    });

  await assert.rejects(
    () => timeoutClient.getStatus(),
    (error) => (
      error.code ===
        'ARDUINO_TIMEOUT' &&
      error.statusCode === 504
    )
  );

  const authClient =
    new ArduinoClient({
      config: createConfig(),
      transport: async () => {
        const error =
          new Error('forbidden');

        error.response = {
          status: 403
        };

        throw error;
      }
    });

  await assert.rejects(
    () => authClient.getStatus(),
    (error) => (
      error.code ===
        'ARDUINO_AUTH_FAILED' &&
      error.statusCode === 502 &&
      error.upstreamStatus === 403
    )
  );

  clearRuntimeContextForTests();

  assert.strictEqual(
    getOptionalRuntimeContext(),
    null
  );

  const runtimeContext =
    setRuntimeContext({
      config: {
        service: {
          name:
            'arduino-led-controller'
        }
      },
      arduinoClient: client
    });

  assert.strictEqual(
    getRuntimeContext(),
    runtimeContext
  );

  assert.strictEqual(
    Object.isFrozen(runtimeContext),
    true
  );

  assert.throws(
    () => setRuntimeContext({}),
    /már inicializálva/
  );

  clearRuntimeContextForTests();

  console.log(
    'OK: megosztott Arduino HTTP-kliens'
  );
  console.log(
    'OK: Arduino URL titokmentes és X-Device-Key fejlécet használ'
  );
  console.log(
    'OK: Arduino hibák egységes leképezése'
  );
  console.log(
    'OK: központi runtime context'
  );
}

main().catch((error) => {
  clearRuntimeContextForTests();
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
