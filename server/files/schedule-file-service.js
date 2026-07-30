'use strict';

const fs = require('fs');
const path = require('path');

const {
  EVENT_TOPICS
} = require('../events/topics');

const {
  normalizeScheduleFilename
} = require('../schedule/schedule-validation');

const {
  FileServiceError
} = require('./file-service-error');

function normalizeContent(value) {
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value ?? '');
}

function parseScheduleJson(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new FileServiceError(
      400,
      'INVALID_SCHEDULE_JSON',
      'Az ütemezésfájl nem érvényes JSON.',
      { message: error.message },
      { cause: error }
    );
  }
}

class ScheduleFileService {
  constructor({
    schedulesDir,
    arduinoClient = null,
    uploadEndpoint = '',
    maximumBytes = 1024 * 1024,
    eventBus = null,
    logger = null
  } = {}) {
    if (typeof schedulesDir !== 'string' || !schedulesDir.trim()) {
      throw new TypeError('A schedule fájlszolgáltatás könyvtára kötelező.');
    }
    this.schedulesDir = path.resolve(schedulesDir);
    this.arduinoClient = arduinoClient;
    this.uploadEndpoint = String(uploadEndpoint || '').trim().replace(/^\/+/, '');
    this.maximumBytes = Math.max(1024, Math.min(10 * 1024 * 1024, Number(maximumBytes) || 1024 * 1024));
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async ensureDirectory() {
    await fs.promises.mkdir(this.schedulesDir, { recursive: true });
  }

  resolveScheduleFile(filename) {
    const normalized = normalizeScheduleFilename(filename);
    const resolved = path.resolve(this.schedulesDir, normalized);
    if (path.dirname(resolved) !== this.schedulesDir) {
      throw new FileServiceError(400, 'INVALID_FILE_PATH', 'Érvénytelen fájlútvonal.');
    }
    return { normalized, resolved };
  }

  async list({ includeAll = false } = {}) {
    await this.ensureDirectory();
    const names = await fs.promises.readdir(this.schedulesDir);
    const files = [];

    for (const name of names) {
      let normalized = null;
      try {
        normalized = normalizeScheduleFilename(name);
      } catch (_) {
        if (!includeAll) continue;
      }

      const filePath = path.join(this.schedulesDir, name);
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) continue;
      files.push({
        name,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        scheduleFile: Boolean(normalized)
      });
    }

    return files.sort((left, right) => left.name.localeCompare(right.name));
  }

  async read(filename) {
    const { normalized, resolved } = this.resolveScheduleFile(filename);
    let stats;
    try {
      stats = await fs.promises.stat(resolved);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new FileServiceError(404, 'SCHEDULE_FILE_NOT_FOUND', 'Az ütemezésfájl nem található.', { filename: normalized });
      }
      throw error;
    }
    if (!stats.isFile()) {
      throw new FileServiceError(404, 'SCHEDULE_FILE_NOT_FOUND', 'Az ütemezésfájl nem található.');
    }
    if (stats.size > this.maximumBytes) {
      throw new FileServiceError(413, 'SCHEDULE_FILE_TOO_LARGE', 'Az ütemezésfájl túl nagy.', { maximumBytes: this.maximumBytes, size: stats.size });
    }
    const content = await fs.promises.readFile(resolved, 'utf8');
    return {
      name: normalized,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      document: parseScheduleJson(content),
      content
    };
  }

  async store(filename, value, { uploadArduino = true } = {}) {
    const { normalized, resolved } = this.resolveScheduleFile(filename);
    const content = normalizeContent(value);
    const size = Buffer.byteLength(content, 'utf8');
    if (size < 2) {
      throw new FileServiceError(400, 'EMPTY_SCHEDULE_FILE', 'Az ütemezésfájl üres.');
    }
    if (size > this.maximumBytes) {
      throw new FileServiceError(413, 'SCHEDULE_FILE_TOO_LARGE', 'Az ütemezésfájl túl nagy.', { maximumBytes: this.maximumBytes, size });
    }
    parseScheduleJson(content);
    await this.ensureDirectory();
    const temporary = `${resolved}.tmp-${process.pid}-${Date.now()}`;
    await fs.promises.writeFile(temporary, `${content.trim()}\n`, { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(temporary, resolved);

    let arduino = null;
    let arduinoUploaded = false;
    if (uploadArduino && this.uploadEndpoint && this.arduinoClient) {
      const result = await this.arduinoClient.post(
        this.uploadEndpoint,
        { filename: normalized, content },
        { source: 'arduino-led-schedule-file-upload' }
      );
      arduino = result.data;
      arduinoUploaded = true;
    }

    const result = {
      success: true,
      filename: normalized,
      size,
      storedLocally: true,
      arduinoUploaded,
      uploadEndpointConfigured: Boolean(this.uploadEndpoint),
      arduino
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_FILE_STORED,
      result
    );
    this.logger?.info?.('Schedule fájl elmentve.', result);
    return result;
  }

  status() {
    return {
      schedulesDir: this.schedulesDir,
      maximumBytes: this.maximumBytes,
      uploadEndpointConfigured: Boolean(this.uploadEndpoint)
    };
  }
}

module.exports = {
  ScheduleFileService,
  normalizeContent,
  parseScheduleJson
};
