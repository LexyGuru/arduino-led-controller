'use strict';

const fs = require('fs');
const path = require('path');

const HOST_PATTERN =
  /^(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[0-9A-Fa-f:]+\])$/;

class RuntimeSettingsError extends Error {
  constructor(
    code,
    message,
    details = null
  ) {
    super(message);
    this.name =
      'RuntimeSettingsError';
    this.code =
      String(code);
    this.statusCode = 400;
    this.details = details;
  }
}

function normalizeArduinoTarget(
  input = {}
) {
  const ip =
    String(
      input.arduinoIP ??
      input.ip ??
      ''
    ).trim();

  const port =
    Number(
      input.arduinoPort ??
      input.port ??
      80
    );

  if (
    !HOST_PATTERN.test(ip) ||
    ip.length > 253
  ) {
    throw new RuntimeSettingsError(
      'INVALID_ARDUINO_HOST',
      'Adj meg érvényes IP-címet vagy helyi gépnevet.',
      {
        arduinoIP:
          input.arduinoIP ??
          input.ip ??
          null
      }
    );
  }

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new RuntimeSettingsError(
      'INVALID_ARDUINO_PORT',
      'A port 1 és 65535 közötti egész szám legyen.',
      {
        arduinoPort:
          input.arduinoPort ??
          input.port ??
          null
      }
    );
  }

  return Object.freeze({
    arduinoIP: ip,
    arduinoPort: port
  });
}

class RuntimeSettingsService {
  constructor({
    settingsFile,
    arduinoClient,
    otaRunner = null,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      typeof settingsFile !==
        'string' ||
      !settingsFile.trim()
    ) {
      throw new TypeError(
        'A runtime settings fájlútvonala kötelező.'
      );
    }

    if (
      !arduinoClient ||
      typeof arduinoClient.setTarget !==
        'function'
    ) {
      throw new TypeError(
        'A RuntimeSettingsService számára módosítható ArduinoClient szükséges.'
      );
    }

    this.settingsFile =
      settingsFile;
    this.arduinoClient =
      arduinoClient;
    this.otaRunner =
      otaRunner;
    this.logger = logger;
    this.eventBus =
      eventBus;
    this.writeQueue =
      Promise.resolve();
  }

  getArduinoTarget() {
    return {
      arduinoIP:
        this.arduinoClient
          .config.ip,
      arduinoPort:
        this.arduinoClient
          .config.port
    };
  }

  enqueue(operation) {
    const execution =
      this.writeQueue.then(
        operation,
        operation
      );

    this.writeQueue =
      execution.catch(
        () => undefined
      );

    return execution;
  }

  async writeAtomic(data) {
    const directory =
      path.dirname(
        this.settingsFile
      );

    await fs.promises.mkdir(
      directory,
      {
        recursive: true
      }
    );

    let current = {};

    try {
      current =
        JSON.parse(
          await fs.promises.readFile(
            this.settingsFile,
            'utf8'
          )
        );
    } catch (error) {
      if (
        error.code !== 'ENOENT'
      ) {
        current = {};
      }
    }

    const updated = {
      ...(
        current &&
        typeof current === 'object'
          ? current
          : {}
      ),
      ...data,
      updatedAt:
        new Date().toISOString()
    };

    const temporary =
      `${this.settingsFile}.tmp-${process.pid}-${Date.now()}`;

    await fs.promises.writeFile(
      temporary,
      `${JSON.stringify(
        updated,
        null,
        2
      )}\n`,
      {
        encoding: 'utf8',
        mode: 0o600
      }
    );

    await fs.promises.rename(
      temporary,
      this.settingsFile
    );

    return updated;
  }

  async updateArduinoTarget(
    input,
    {
      principal = null
    } = {}
  ) {
    const target =
      normalizeArduinoTarget(
        input
      );

    return this.enqueue(
      async () => {
        await this.writeAtomic(
          target
        );

        this.arduinoClient
          .setTarget(
            target.arduinoIP,
            target.arduinoPort
          );

        this.otaRunner
          ?.setTarget?.(
            target.arduinoIP
          );

        this.logger?.info?.(
          'Arduino célgép módosítva.',
          target
        );

        this.eventBus
          ?.publish?.(
            'settings.arduino-updated',
            {
              ...target,
              principal:
                principal
                  ? {
                      subject:
                        principal.subject,
                      role:
                        principal.role
                    }
                  : null
            }
          );

        return {
          success: true,
          ...target
        };
      }
    );
  }
}

module.exports = {
  HOST_PATTERN,
  RuntimeSettingsError,
  RuntimeSettingsService,
  normalizeArduinoTarget
};
