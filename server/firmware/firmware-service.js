'use strict';

const fs = require('fs');
const path = require('path');

const {
  FirmwareServiceError
} = require('./firmware-error');

const BUSY_STATES = Object.freeze([
  'checking',
  'downloading',
  'uploading',
  'restarting'
]);

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

class FirmwareService {
  constructor({
    arduinoClient,
    releaseClient,
    otaRunner,
    firmwareDir,
    otaToolPath,
    otaPassword,
    repository,
    releaseTag,
    logger = null,
    waitImplementation = wait,
    restartTimeoutMs = 90000
  } = {}) {
    this.arduinoClient = arduinoClient;
    this.releaseClient = releaseClient;
    this.otaRunner = otaRunner;
    this.firmwareDir = firmwareDir;
    this.otaToolPath = otaToolPath;
    this.otaPassword = otaPassword;
    this.repository = repository;
    this.releaseTag = releaseTag;
    this.logger = logger;
    this.wait = waitImplementation;
    this.restartTimeoutMs = Number(restartTimeoutMs);

    this.state = {
      state: 'idle',
      message: 'Nincs folyamatban firmware-frissítés.',
      startedAt: null,
      finishedAt: null,
      artifact: null,
      installedVersion: null
    };
  }

  setState(state, message, extra = {}) {
    Object.assign(this.state, {
      state,
      message,
      ...extra
    });

    this.logger?.info?.('Firmware OTA állapot.', {
      state,
      message
    });
  }

  isBusy() {
    return BUSY_STATES.includes(this.state.state);
  }

  configurationStatus() {
    let otaToolInstalled = false;

    try {
      otaToolInstalled =
        Boolean(this.otaToolPath);

      if (otaToolInstalled) {
        fs.accessSync(
          this.otaToolPath,
          fs.constants.X_OK
        );
      }
    } catch (_) {
      otaToolInstalled = false;
    }

    return {
      otaToolInstalled,
      otaPasswordConfigured: Boolean(this.otaPassword)
    };
  }

  assertConfigured() {
    const status = this.configurationStatus();

    if (
      !status.otaToolInstalled ||
      !status.otaPasswordConfigured
    ) {
      throw FirmwareServiceError.notConfigured(status);
    }
  }

  checkRelease() {
    return this.releaseClient.getLatestArtifact();
  }

  async getStatus() {
    let installedVersion = null;
    let arduinoOnline = false;
    let networkConfigStored = false;
    let availableFirmware = null;
    let firmwareLookupError = null;

    try {
      const result = await this.arduinoClient.getStatus();
      installedVersion = result.status.firmwareVersion || null;
      networkConfigStored =
        result.status.networkConfigStored === true;
      arduinoOnline = true;
    } catch (error) {
      this.logger?.warn?.('Firmware státusz: Arduino offline.', {
        code: error.code
      });
    }

    try {
      availableFirmware = await this.checkRelease();
    } catch (error) {
      firmwareLookupError = error.message;
    }

    const configuration = this.configurationStatus();

    return {
      ...this.state,
      installedVersion,
      arduinoOnline,
      networkConfigStored,
      otaConfigured:
        configuration.otaToolInstalled &&
        configuration.otaPasswordConfigured &&
        networkConfigStored,
      ...configuration,
      availableFirmware,
      firmwareLookupError,
      repository: this.repository,
      releaseTag: this.releaseTag
    };
  }

  async confirmRestart(artifact) {
    const deadline = Date.now() + this.restartTimeoutMs;
    let attempt = 0;
    let lastError = null;

    while (Date.now() < deadline) {
      await this.wait(attempt++ === 0 ? 3000 : 2000);

      try {
        const result = await this.arduinoClient.getStatus();
        const installed = result.status.firmwareVersion || null;

        if (
          artifact.firmwareVersion &&
          installed &&
          installed !== artifact.firmwareVersion
        ) {
          continue;
        }

        this.setState(
          'success',
          `Firmware sikeresen telepítve: ${installed || 'új verzió'}.`,
          {
            artifact,
            installedVersion: installed,
            finishedAt: new Date().toISOString()
          }
        );

        return;
      } catch (error) {
        lastError = error;
      }
    }

    this.setState(
      'error',
      'A firmware feltöltése után az Arduino nem jelentkezett vissza időben.',
      {
        artifact,
        finishedAt: new Date().toISOString(),
        lastError: lastError?.message
      }
    );
  }

  async runUpdate() {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(this.state.state);
    }

    this.assertConfigured();

    this.setState(
      'checking',
      'A firmware-csomag ellenőrzése…',
      {
        startedAt: new Date().toISOString(),
        finishedAt: null,
        artifact: null
      }
    );

    try {
      const arduino = await this.arduinoClient.getStatus();

      if (arduino.status.networkConfigStored !== true) {
        throw new FirmwareServiceError(
          409,
          'ARDUINO_NETWORK_CONFIG_MISSING',
          'Az Arduino még nem mentette el a WiFi- és OTA-beállításait.'
        );
      }

      const artifact = await this.checkRelease();

      this.setState(
        'downloading',
        'A firmware letöltése és ellenőrzése…',
        { artifact }
      );

      const binaryPath = path.join(
        this.firmwareDir,
        'latest-arduino-firmware.bin'
      );

      const downloaded = await this.releaseClient.downloadVerified(
        artifact,
        binaryPath
      );

      this.setState(
        'uploading',
        'Firmware átvitele az Arduino OTA szolgáltatására…',
        {
          artifact,
          downloaded
        }
      );

      await this.otaRunner.upload(binaryPath);

      this.setState(
        'restarting',
        'Az Arduino újraindul; várakozás az új firmware-re…',
        { artifact }
      );

      await this.confirmRestart(artifact);

      return {
        accepted: true,
        artifact,
        downloaded,
        state: this.state.state
      };
    } catch (error) {
      this.setState(
        'error',
        `A frissítés nem sikerült: ${error.message}`,
        {
          finishedAt: new Date().toISOString(),
          code: error.code || 'FIRMWARE_UPDATE_FAILED'
        }
      );

      throw error;
    }
  }

  startUpdate() {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(this.state.state);
    }

    this.runUpdate().catch((error) => {
      this.logger?.error?.('Firmware OTA háttérfeladat hiba.', {
        code: error.code,
        message: error.message
      });
    });

    return {
      accepted: true,
      state: 'checking',
      message: 'A firmware-frissítés elindult.'
    };
  }
}

module.exports = {
  BUSY_STATES,
  FirmwareService,
  wait
};
