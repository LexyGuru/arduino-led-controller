'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;

      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForJson(url, child, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `A tesztszerver idő előtt leállt: ${child.exitCode}`
      );
    }

    try {
      const response = await fetch(url);
      const body = await response.json();

      return {
        response,
        body
      };
    } catch (error) {
      lastError = error;

      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
    }
  }

  throw lastError || new Error(`Időtúllépés: ${url}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => {
      child.once('exit', resolve);
    }),
    new Promise((resolve) => {
      setTimeout(resolve, 3000);
    })
  ]);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'arduino-led-health-')
  );

  const dataDir = path.join(tempRoot, 'data');
  const configDir = path.join(tempRoot, 'config');
  const schedulesDir = path.join(tempRoot, 'schedules');
  const firmwareDir = path.join(dataDir, 'firmware');

  for (const directory of [
    dataDir,
    configDir,
    schedulesDir,
    firmwareDir
  ]) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }

  const port = await reservePort();
  const unusedArduinoPort = await reservePort();

  let output = '';
  let child;

  try {
    child = spawn(
      process.execPath,
      ['server2_final.js'],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOG_LEVEL: 'error',
          BIND_HOST: '127.0.0.1',
          PORT: String(port),
          DATA_DIR: dataDir,
          CONFIG_DIR: configDir,
          SCHEDULES_DIR: schedulesDir,
          FIRMWARE_DIR: firmwareDir,
          AUTH_FILE: path.join(
            configDir,
            'users.json'
          ),
          AUDIT_FILE: path.join(
            dataDir,
            'audit-log.jsonl'
          ),
          ARDUINO_IP: '127.0.0.1',
          ARDUINO_PORT: String(unusedArduinoPort),
          ARDUINO_API_PATH:
            '/health-test-private-path',
          ARDUINO_API_KEY:
            'health-test-secret-1234567890',
          ARDUINO_HEALTH_TIMEOUT_MS: '500',
          ARDUINO_RETRY_COUNT: '0',
          COOKIE_SECURE: '0'
        },
        stdio: [
          'ignore',
          'pipe',
          'pipe'
        ]
      }
    );

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    const baseUrl = `http://127.0.0.1:${port}`;

    const live = await waitForJson(
      `${baseUrl}/health/live`,
      child
    );

    if (
      live.response.status !== 200 ||
      live.body.ok !== true ||
      live.body.status !== 'live'
    ) {
      throw new Error(
        `Hibás live health válasz: ` +
        `${live.response.status} ` +
        JSON.stringify(live.body)
      );
    }

    const readyResponse = await fetch(
      `${baseUrl}/health/ready`
    );
    const readyBody = await readyResponse.json();

    if (
      readyResponse.status !== 200 ||
      readyBody.ok !== true ||
      readyBody.status !== 'ready'
    ) {
      throw new Error(
        `Hibás ready health válasz: ` +
        `${readyResponse.status} ` +
        JSON.stringify(readyBody)
      );
    }

    const arduinoResponse = await fetch(
      `${baseUrl}/health/arduino`
    );
    const arduinoBody = await arduinoResponse.json();

    if (
      arduinoResponse.status !== 503 ||
      arduinoBody.ok !== false ||
      arduinoBody.status !== 'unreachable'
    ) {
      throw new Error(
        `Hibás Arduino health válasz: ` +
        `${arduinoResponse.status} ` +
        JSON.stringify(arduinoBody)
      );
    }

    console.log('OK: /health/live');
    console.log('OK: /health/ready');
    console.log(
      'OK: /health/arduino offline állapot'
    );
  } catch (error) {
    if (output.trim()) {
      console.error(
        '\nTesztszerver kimenete:\n' +
        output.trim()
      );
    }

    throw error;
  } finally {
    await stopChild(child);

    fs.rmSync(tempRoot, {
      recursive: true,
      force: true
    });
  }
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
