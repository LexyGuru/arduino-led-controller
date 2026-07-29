'use strict';

const {
  spawn
} = require('child_process');

function runProgram(
  command,
  args,
  {
    timeoutMs = 180000,
    spawnImplementation = spawn,
    onChild = null
  } = {}
) {
  return new Promise((resolve, reject) => {
    const child = spawnImplementation(
      command,
      args,
      { shell: false }
    );

    onChild?.(child);

    const chunks = [];
    let outputSize = 0;
    let timedOut = false;

    const append = (chunk) => {
      if (outputSize >= 65536) {
        return;
      }

      const part = Buffer.from(chunk).subarray(
        0,
        65536 - outputSize
      );

      chunks.push(part);
      outputSize += part.length;
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);

      const output = Buffer.concat(chunks)
        .toString('utf8');

      if (code === 0) {
        resolve({ code, output });
        return;
      }

      const detail = output.trim() ||
        `kilépési kód: ${code}${signal ? ` (${signal})` : ''}`;

      const error = new Error(
        detail.slice(0, 2000)
      );

      error.code = timedOut
        ? 'OTA_UPLOAD_TIMEOUT'
        : signal === 'SIGTERM'
          ? 'OTA_UPLOAD_CANCELLED'
          : 'OTA_UPLOAD_FAILED';

      reject(error);
    });
  });
}

class OtaRunner {
  constructor({
    toolPath,
    address,
    port = 65280,
    username = 'arduino',
    password,
    timeoutMs = 240000,
    programRunner = runProgram
  } = {}) {
    this.toolPath = toolPath;
    this.address = address;
    this.port = Number(port);
    this.username = username;
    this.password = password;
    this.timeoutMs = Number(timeoutMs);
    this.programRunner = programRunner;
    this.currentChild = null;
    this.running = false;
  }

  setTarget(address) {
    const normalized =
      String(address || '').trim();

    if (!normalized) {
      throw new TypeError(
        'Az OTA célcíme nem lehet üres.'
      );
    }

    this.address = normalized;

    return { address: this.address };
  }

  isRunning() {
    return this.running;
  }

  async upload(binaryPath) {
    if (this.running) {
      const error = new Error(
        'Már folyamatban van OTA-feltöltés.'
      );
      error.code = 'OTA_UPLOAD_BUSY';
      throw error;
    }

    this.running = true;

    try {
      return await this.programRunner(
        this.toolPath,
        [
          '-address', String(this.address),
          '-port', String(this.port),
          '-username', String(this.username),
          '-password', String(this.password),
          '-sketch', binaryPath,
          '-upload', '/sketch',
          '-b'
        ],
        {
          timeoutMs: this.timeoutMs,
          onChild: (child) => {
            this.currentChild = child;
          }
        }
      );
    } finally {
      this.currentChild = null;
      this.running = false;
    }
  }

  cancel() {
    if (!this.running) {
      return {
        cancelled: false,
        reason: 'NOT_RUNNING'
      };
    }

    const killed = this.currentChild
      ? this.currentChild.kill('SIGTERM')
      : false;

    return {
      cancelled: true,
      processSignalled: killed
    };
  }
}

module.exports = {
  OtaRunner,
  runProgram
};
