'use strict';

const {
  spawn
} = require('child_process');

function runProgram(
  command,
  args,
  {
    timeoutMs = 180000,
    spawnImplementation = spawn
  } = {}
) {
  return new Promise((resolve, reject) => {
    const child = spawnImplementation(
      command,
      args,
      { shell: false }
    );

    const chunks = [];
    let outputSize = 0;

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

    const timer = setTimeout(
      () => child.kill('SIGTERM'),
      timeoutMs
    );

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);

      const output = Buffer.concat(chunks).toString('utf8');

      if (code === 0) {
        resolve({ code, output });
        return;
      }

      const detail = output.trim() ||
        `kilépési kód: ${code}${signal ? ` (${signal})` : ''}`;

      reject(new Error(detail.slice(0, 2000)));
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
  }

  upload(binaryPath) {
    return this.programRunner(
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
        timeoutMs: this.timeoutMs
      }
    );
  }
}

module.exports = {
  OtaRunner,
  runProgram
};
