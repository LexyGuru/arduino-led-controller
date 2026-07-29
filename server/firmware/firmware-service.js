'use strict';

const fs = require('fs');
const path = require('path');

const {
  FirmwareServiceError
} = require('./firmware-error');

const {
  EVENT_TOPICS
} = require('../events/topics');

const BUSY_STATES = Object.freeze([
  'checking',
  'downloading',
  'uploading',
  'restarting',
  'rollback-loading',
  'rollback-uploading',
  'rollback-restarting'
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
    backupStore = null,
    firmwareDir,
    otaToolPath,
    otaPassword,
    repository,
    releaseTag,
    logger = null,
    eventBus = null,
    waitImplementation = wait,
    restartTimeoutMs = 90000
  } = {}) {
    this.arduinoClient = arduinoClient;
    this.releaseClient = releaseClient;
    this.otaRunner = otaRunner;
    this.backupStore = backupStore;
    this.firmwareDir = firmwareDir;
    this.otaToolPath = otaToolPath;
    this.otaPassword = otaPassword;
    this.repository = repository;
    this.releaseTag = releaseTag;
    this.logger = logger;
    this.eventBus = eventBus;
    this.wait = waitImplementation;
    this.restartTimeoutMs = Number(restartTimeoutMs);
    this.cancelRequested = false;

    this.state = {
      state: 'idle',
      operation: null,
      message: 'Nincs folyamatban firmware-frissítés.',
      startedAt: null,
      finishedAt: null,
      artifact: null,
      backup: null,
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
      message,
      operation: this.state.operation
    });

    this.eventBus?.publish?.(
      EVENT_TOPICS.FIRMWARE_STATE,
      {
        state,
        operation: this.state.operation,
        message,
        startedAt: this.state.startedAt,
        finishedAt: this.state.finishedAt,
        firmwareVersion:
          this.state.artifact?.firmwareVersion ||
          this.state.installedVersion ||
          null,
        backupId: this.state.backup?.id || null
      }
    );
  }

  isBusy() {
    return BUSY_STATES.includes(
      this.state.state
    );
  }

  configurationStatus() {
    let otaToolInstalled = false;

    try {
      otaToolInstalled = Boolean(
        this.otaToolPath
      );

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
      otaPasswordConfigured:
        Boolean(this.otaPassword),
      backupStoreConfigured:
        Boolean(this.backupStore)
    };
  }

  assertConfigured() {
    const status = this.configurationStatus();

    if (
      !status.otaToolInstalled ||
      !status.otaPasswordConfigured
    ) {
      throw FirmwareServiceError
        .notConfigured(status);
    }
  }

  assertNotCancelled() {
    if (this.cancelRequested) {
      throw FirmwareServiceError.cancelled();
    }
  }

  checkRelease() {
    return this.releaseClient
      .getLatestArtifact();
  }

  async listBackups() {
    return this.backupStore
      ? this.backupStore.list()
      : [];
  }

  async deleteBackup(id) {
    if (!this.backupStore) {
      throw new FirmwareServiceError(
        503,
        'FIRMWARE_BACKUP_NOT_CONFIGURED',
        'A firmware backup szolgáltatás nincs beállítva.'
      );
    }

    return this.backupStore.remove(id);
  }

  async getStatus() {
    let installedVersion = null;
    let arduinoOnline = false;
    let networkConfigStored = false;
    let availableFirmware = null;
    let firmwareLookupError = null;

    try {
      const result = await this.arduinoClient
        .getStatus();

      installedVersion =
        result.status.firmwareVersion || null;
      networkConfigStored =
        result.status.networkConfigStored === true;
      arduinoOnline = true;
    } catch (error) {
      this.logger?.warn?.(
        'Firmware státusz: Arduino offline.',
        { code: error.code }
      );
    }

    try {
      availableFirmware = await this.checkRelease();
    } catch (error) {
      firmwareLookupError = error.message;
    }

    const configuration =
      this.configurationStatus();

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
      backups: await this.listBackups(),
      repository: this.repository,
      releaseTag: this.releaseTag
    };
  }

  async confirmRestart(artifact, statePrefix = '') {
    const deadline = Date.now() + this.restartTimeoutMs;
    let attempt = 0;
    let lastError = null;

    while (Date.now() < deadline) {
      this.assertNotCancelled();
      await this.wait(attempt++ === 0 ? 3000 : 2000);

      try {
        const result = await this.arduinoClient
          .getStatus();

        const installed =
          result.status.firmwareVersion || null;

        if (
          artifact?.firmwareVersion &&
          installed &&
          installed !== artifact.firmwareVersion
        ) {
          continue;
        }

        this.setState(
          'success',
          `${statePrefix}firmware sikeresen telepítve: ${installed || 'új verzió'}.`,
          {
            artifact,
            installedVersion: installed,
            finishedAt: new Date().toISOString()
          }
        );

        return installed;
      } catch (error) {
        lastError = error;
      }
    }

    throw new FirmwareServiceError(
      504,
      'FIRMWARE_RESTART_TIMEOUT',
      'A firmware feltöltése után az Arduino nem jelentkezett vissza időben.',
      {
        lastError: lastError?.message || null
      }
    );
  }

  async runUpdate() {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(
        this.state.state
      );
    }

    this.assertConfigured();
    this.cancelRequested = false;

    this.setState(
      'checking',
      'A firmware-csomag ellenőrzése…',
      {
        operation: 'update',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        artifact: null,
        backup: null
      }
    );

    try {
      const arduino = await this.arduinoClient
        .getStatus();

      if (
        arduino.status.networkConfigStored !== true
      ) {
        throw new FirmwareServiceError(
          409,
          'ARDUINO_NETWORK_CONFIG_MISSING',
          'Az Arduino még nem mentette el a WiFi- és OTA-beállításait.'
        );
      }

      this.assertNotCancelled();
      const artifact = await this.checkRelease();

      this.setState(
        'downloading',
        'A firmware letöltése és ellenőrzése…',
        { artifact }
      );

      const binaryPath = path.join(
        this.firmwareDir,
        `incoming-${Date.now()}.bin`
      );

      const downloaded = await this.releaseClient
        .downloadVerified(
          artifact,
          binaryPath
        );

      this.assertNotCancelled();

      const backup = this.backupStore
        ? await this.backupStore.storeCandidate({
            sourcePath: downloaded.path,
            artifact,
            expectedSha256: downloaded.sha256,
            source: 'release'
          })
        : null;

      const uploadPath =
        backup?.binaryPath || downloaded.path;

      this.setState(
        'uploading',
        'Firmware átvitele az Arduino OTA szolgáltatására…',
        {
          artifact,
          downloaded,
          backup
        }
      );

      await this.otaRunner.upload(uploadPath);
      this.assertNotCancelled();

      this.setState(
        'restarting',
        'Az Arduino újraindul; várakozás az új firmware-re…',
        { artifact, backup }
      );

      const installed = await this.confirmRestart(
        artifact
      );

      const marked =
        backup && this.backupStore
          ? await this.backupStore
              .markLastKnownGood(
                backup.id,
                installed
              )
          : backup;

      if (marked) {
        this.state.backup = marked;
      }

      return {
        accepted: true,
        artifact,
        downloaded,
        backup: marked,
        state: this.state.state
      };
    } catch (error) {
      if (
        error.code === 'FIRMWARE_UPDATE_CANCELLED' ||
        error.code === 'OTA_UPLOAD_CANCELLED'
      ) {
        this.setState(
          'cancelled',
          'A firmware-művelet meg lett szakítva.',
          {
            finishedAt: new Date().toISOString(),
            code: 'FIRMWARE_UPDATE_CANCELLED'
          }
        );
      } else {
        this.setState(
          'error',
          `A frissítés nem sikerült: ${error.message}`,
          {
            finishedAt: new Date().toISOString(),
            code:
              error.code ||
              'FIRMWARE_UPDATE_FAILED'
          }
        );
      }

      throw error;
    }
  }

  async runRollback(backupId) {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(
        this.state.state
      );
    }

    this.assertConfigured();

    if (!this.backupStore) {
      throw new FirmwareServiceError(
        503,
        'FIRMWARE_BACKUP_NOT_CONFIGURED',
        'A firmware backup szolgáltatás nincs beállítva.'
      );
    }

    this.cancelRequested = false;

    this.setState(
      'rollback-loading',
      'Firmware backup betöltése…',
      {
        operation: 'rollback',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        artifact: null,
        backup: null
      }
    );

    try {
      const arduino = await this.arduinoClient
        .getStatus();

      if (
        arduino.status.networkConfigStored !== true
      ) {
        throw new FirmwareServiceError(
          409,
          'ARDUINO_NETWORK_CONFIG_MISSING',
          'Az Arduino még nem mentette el a WiFi- és OTA-beállításait.'
        );
      }

      const backup = await this.backupStore
        .getRequired(backupId);

      this.assertNotCancelled();

      this.setState(
        'rollback-uploading',
        'Korábbi firmware visszatöltése OTA-n…',
        {
          backup,
          artifact: backup.artifact || null
        }
      );

      await this.otaRunner.upload(
        backup.binaryPath
      );

      this.assertNotCancelled();

      this.setState(
        'rollback-restarting',
        'Az Arduino újraindul a visszaállított firmware-rel…',
        {
          backup,
          artifact: backup.artifact || null
        }
      );

      const installed = await this.confirmRestart(
        backup.artifact || {},
        'Visszaállított '
      );

      const marked = await this.backupStore
        .markLastKnownGood(
          backup.id,
          installed
        );

      this.state.backup = marked;

      return {
        accepted: true,
        backup: marked,
        installedVersion: installed,
        state: this.state.state
      };
    } catch (error) {
      if (
        error.code === 'FIRMWARE_UPDATE_CANCELLED' ||
        error.code === 'OTA_UPLOAD_CANCELLED'
      ) {
        this.setState(
          'cancelled',
          'A firmware-visszaállítás meg lett szakítva.',
          {
            finishedAt: new Date().toISOString(),
            code: 'FIRMWARE_UPDATE_CANCELLED'
          }
        );
      } else {
        this.setState(
          'error',
          `A firmware-visszaállítás nem sikerült: ${error.message}`,
          {
            finishedAt: new Date().toISOString(),
            code:
              error.code ||
              'FIRMWARE_ROLLBACK_FAILED'
          }
        );
      }

      throw error;
    }
  }

  startUpdate() {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(
        this.state.state
      );
    }

    this.runUpdate().catch((error) => {
      this.logger?.error?.(
        'Firmware OTA háttérfeladat hiba.',
        {
          code: error.code,
          message: error.message
        }
      );
    });

    return {
      accepted: true,
      state: 'checking',
      operation: 'update',
      message: 'A firmware-frissítés elindult.'
    };
  }

  startRollback(backupId) {
    if (this.isBusy()) {
      throw FirmwareServiceError.busy(
        this.state.state
      );
    }

    this.runRollback(backupId).catch((error) => {
      this.logger?.error?.(
        'Firmware rollback háttérfeladat hiba.',
        {
          code: error.code,
          message: error.message,
          backupId
        }
      );
    });

    return {
      accepted: true,
      state: 'rollback-loading',
      operation: 'rollback',
      backupId,
      message: 'A firmware-visszaállítás elindult.'
    };
  }

  cancel() {
    if (!this.isBusy()) {
      return {
        cancelled: false,
        reason: 'NOT_RUNNING',
        state: this.state.state
      };
    }

    this.cancelRequested = true;
    const ota = this.otaRunner.cancel?.() || {
      cancelled: false,
      reason: 'UPLOAD_NOT_RUNNING'
    };

    this.setState(
      'cancelled',
      'A firmware-művelet megszakítása kérve.',
      {
        finishedAt: new Date().toISOString(),
        code: 'FIRMWARE_UPDATE_CANCELLED'
      }
    );

    return {
      cancelled: true,
      ota
    };
  }
}

module.exports = {
  BUSY_STATES,
  FirmwareService,
  wait
};
