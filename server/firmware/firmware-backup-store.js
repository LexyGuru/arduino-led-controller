'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  FirmwareServiceError
} = require('./firmware-error');

const BACKUP_ID_PATTERN =
  /^fw_[0-9]{8}T[0-9]{6}_[a-f0-9]{12}$/;

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);

    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(hash.digest('hex')));
  });
}

function publicBackup(record) {
  return {
    id: record.id,
    fileName: record.fileName,
    size: record.size,
    sha256: record.sha256,
    createdAt: record.createdAt,
    installedAt: record.installedAt || null,
    installedVersion: record.installedVersion || null,
    lastKnownGood: record.lastKnownGood === true,
    source: record.source,
    artifact: record.artifact || null
  };
}

class FirmwareBackupStore {
  constructor({
    backupDir,
    maximumBackups = 8,
    logger = null
  } = {}) {
    if (
      typeof backupDir !== 'string' ||
      !backupDir.trim()
    ) {
      throw new TypeError(
        'A firmware backup könyvtár kötelező.'
      );
    }

    this.backupDir = backupDir;
    this.indexFile = path.join(
      backupDir,
      'index.json'
    );
    this.maximumBackups = Math.max(
      2,
      Number(maximumBackups) || 8
    );
    this.logger = logger;
    this.writeQueue = Promise.resolve();
  }

  async ensureDirectory() {
    await fs.promises.mkdir(
      this.backupDir,
      { recursive: true }
    );
  }

  async readRecords() {
    try {
      const parsed = JSON.parse(
        await fs.promises.readFile(
          this.indexFile,
          'utf8'
        )
      );

      return Array.isArray(parsed.backups)
        ? parsed.backups
        : [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw new FirmwareServiceError(
        500,
        'FIRMWARE_BACKUP_INDEX_INVALID',
        'A firmware backup index nem olvasható.',
        null,
        { cause: error }
      );
    }
  }

  async writeRecords(records) {
    const operation = async () => {
      await this.ensureDirectory();

      const temporary =
        `${this.indexFile}.tmp-${process.pid}-${Date.now()}`;

      await fs.promises.writeFile(
        temporary,
        `${JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          backups: records
        }, null, 2)}\n`,
        {
          encoding: 'utf8',
          mode: 0o600
        }
      );

      await fs.promises.rename(
        temporary,
        this.indexFile
      );

      return records;
    };

    const result = this.writeQueue.then(
      operation,
      operation
    );

    this.writeQueue = result.catch(
      () => undefined
    );

    return result;
  }

  binaryPath(record) {
    const resolved = path.resolve(
      this.backupDir,
      record.fileName
    );

    const root = `${path.resolve(
      this.backupDir
    )}${path.sep}`;

    if (!resolved.startsWith(root)) {
      throw new FirmwareServiceError(
        500,
        'FIRMWARE_BACKUP_PATH_INVALID',
        'Érvénytelen firmware backup útvonal.'
      );
    }

    return resolved;
  }

  async list() {
    const records = await this.readRecords();

    return records
      .slice()
      .sort((left, right) =>
        String(right.createdAt)
          .localeCompare(
            String(left.createdAt)
          )
      )
      .map(publicBackup);
  }

  async getRequired(id) {
    if (!BACKUP_ID_PATTERN.test(String(id || ''))) {
      throw new FirmwareServiceError(
        400,
        'FIRMWARE_BACKUP_ID_INVALID',
        'Érvénytelen firmware backup azonosító.'
      );
    }

    const records = await this.readRecords();
    const record = records.find(
      (candidate) => candidate.id === id
    );

    if (!record) {
      throw new FirmwareServiceError(
        404,
        'FIRMWARE_BACKUP_NOT_FOUND',
        'A firmware backup nem található.',
        { id }
      );
    }

    const binaryPath = this.binaryPath(record);

    try {
      await fs.promises.access(
        binaryPath,
        fs.constants.R_OK
      );
    } catch (error) {
      throw new FirmwareServiceError(
        500,
        'FIRMWARE_BACKUP_BINARY_MISSING',
        'A firmware backup binárisa hiányzik.',
        { id },
        { cause: error }
      );
    }

    return {
      ...record,
      binaryPath
    };
  }

  async storeCandidate({
    sourcePath,
    artifact,
    expectedSha256 = null,
    source = 'release'
  } = {}) {
    await this.ensureDirectory();

    const actualSha256 = await sha256File(
      sourcePath
    );

    if (
      expectedSha256 &&
      actualSha256.toLowerCase() !==
      String(expectedSha256).toLowerCase()
    ) {
      throw new FirmwareServiceError(
        502,
        'FIRMWARE_BACKUP_CHECKSUM_MISMATCH',
        'A backupba kerülő firmware SHA-256 értéke eltér.'
      );
    }

    const stats = await fs.promises.stat(
      sourcePath
    );

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '');

    const id =
      `fw_${timestamp}_${actualSha256.slice(0, 12)}`;

    const fileName = `${id}.bin`;
    const target = path.join(
      this.backupDir,
      fileName
    );
    const temporary = `${target}.tmp`;

    await fs.promises.copyFile(
      sourcePath,
      temporary
    );
    await fs.promises.rename(
      temporary,
      target
    );

    const record = {
      id,
      fileName,
      size: stats.size,
      sha256: actualSha256,
      createdAt: new Date().toISOString(),
      installedAt: null,
      installedVersion: null,
      lastKnownGood: false,
      source,
      artifact: artifact || null
    };

    const records = await this.readRecords();
    const withoutDuplicate = records.filter(
      (candidate) =>
        candidate.id !== id &&
        candidate.sha256 !== actualSha256
    );

    await this.writeRecords([
      ...withoutDuplicate,
      record
    ]);

    await this.prune();

    return {
      ...publicBackup(record),
      binaryPath: target
    };
  }

  async markLastKnownGood(
    id,
    installedVersion = null
  ) {
    const records = await this.readRecords();
    let found = false;
    const now = new Date().toISOString();

    const updated = records.map((record) => {
      if (record.id === id) {
        found = true;
        return {
          ...record,
          lastKnownGood: true,
          installedAt: now,
          installedVersion:
            installedVersion ||
            record.artifact?.firmwareVersion ||
            null
        };
      }

      return {
        ...record,
        lastKnownGood: false
      };
    });

    if (!found) {
      throw new FirmwareServiceError(
        404,
        'FIRMWARE_BACKUP_NOT_FOUND',
        'A firmware backup nem található.',
        { id }
      );
    }

    await this.writeRecords(updated);

    return publicBackup(
      updated.find(
        (record) => record.id === id
      )
    );
  }

  async remove(id) {
    const record = await this.getRequired(id);

    if (record.lastKnownGood) {
      throw new FirmwareServiceError(
        409,
        'FIRMWARE_LAST_KNOWN_GOOD_PROTECTED',
        'Az utolsó működő firmware backup nem törölhető.'
      );
    }

    await fs.promises.rm(
      record.binaryPath,
      { force: true }
    );

    const records = (await this.readRecords())
      .filter((candidate) => candidate.id !== id);

    await this.writeRecords(records);

    return {
      removed: true,
      id
    };
  }

  async prune() {
    const records = await this.readRecords();

    if (records.length <= this.maximumBackups) {
      return { removed: [] };
    }

    const sorted = records
      .slice()
      .sort((left, right) =>
        String(left.createdAt)
          .localeCompare(
            String(right.createdAt)
          )
      );

    const removable = sorted.filter(
      (record) => !record.lastKnownGood
    );

    const removeCount =
      records.length - this.maximumBackups;

    const selected = removable.slice(
      0,
      removeCount
    );

    const selectedIds = new Set(
      selected.map((record) => record.id)
    );

    for (const record of selected) {
      await fs.promises.rm(
        this.binaryPath(record),
        { force: true }
      );
    }

    const remaining = records.filter(
      (record) => !selectedIds.has(record.id)
    );

    await this.writeRecords(remaining);

    return {
      removed: [...selectedIds]
    };
  }
}

module.exports = {
  BACKUP_ID_PATTERN,
  FirmwareBackupStore,
  publicBackup,
  sha256File
};
