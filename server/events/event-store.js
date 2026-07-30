'use strict';

const fs = require('fs');
const path = require('path');

const {
  normalizeTopic,
  positiveInteger
} = require('./event-bus');

function parseJsonLine(line) {
  try {
    const value = JSON.parse(line);

    return (
      value &&
      typeof value === 'object'
    )
      ? value
      : null;
  } catch (_) {
    return null;
  }
}

class EventStore {
  constructor({
    filePath,
    archiveDir,
    maximumBytes = 5 * 1024 * 1024,
    maximumArchives = 5,
    logger = null
  } = {}) {
    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'Az eseménytár fájlútvonala kötelező.'
      );
    }

    this.filePath = filePath;
    this.archiveDir =
      archiveDir ||
      path.join(
        path.dirname(filePath),
        'event-archive'
      );
    this.maximumBytes = Math.max(
      64 * 1024,
      Number(maximumBytes) ||
        5 * 1024 * 1024
    );
    this.maximumArchives = Math.max(
      1,
      Math.min(
        50,
        Number(maximumArchives) || 5
      )
    );
    this.logger = logger;
    this.writeQueue = Promise.resolve();
    this.appendedCount = 0;
    this.rotationCount = 0;
    this.lastWriteAt = null;
    this.lastError = null;
  }

  async ensureDirectories() {
    await fs.promises.mkdir(
      path.dirname(this.filePath),
      {
        recursive: true
      }
    );

    await fs.promises.mkdir(
      this.archiveDir,
      {
        recursive: true
      }
    );
  }

  async currentSize() {
    try {
      const stats =
        await fs.promises.stat(
          this.filePath
        );

      return stats.size;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }

      throw error;
    }
  }

  async rotateIfNeeded(nextBytes) {
    const size =
      await this.currentSize();

    if (
      size + nextBytes <=
      this.maximumBytes
    ) {
      return null;
    }

    await this.ensureDirectories();

    const archiveName =
      `events-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.jsonl`;

    const archivePath =
      path.join(
        this.archiveDir,
        archiveName
      );

    try {
      await fs.promises.rename(
        this.filePath,
        archivePath
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    this.rotationCount += 1;

    const entries =
      await fs.promises.readdir(
        this.archiveDir,
        {
          withFileTypes: true
        }
      );

    const archives =
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            /^events-.*\.jsonl$/
              .test(entry.name)
        )
        .map(
          (entry) => entry.name
        )
        .sort()
        .reverse();

    for (
      const stale
      of archives.slice(
        this.maximumArchives
      )
    ) {
      await fs.promises.rm(
        path.join(
          this.archiveDir,
          stale
        ),
        {
          force: true
        }
      );
    }

    return archiveName;
  }

  append(event) {
    const operation =
      this.writeQueue.then(
        async () => {
          await this.ensureDirectories();

          const line =
            `${JSON.stringify(event)}\n`;

          await this.rotateIfNeeded(
            Buffer.byteLength(
              line,
              'utf8'
            )
          );

          await fs.promises.appendFile(
            this.filePath,
            line,
            {
              encoding: 'utf8',
              mode: 0o600
            }
          );

          this.appendedCount += 1;
          this.lastWriteAt =
            new Date().toISOString();
          this.lastError = null;

          return event;
        }
      );

    this.writeQueue =
      operation.catch(
        (error) => {
          this.lastError =
            error.message;

          this.logger?.error?.(
            'Tartós eseménytár írási hiba.',
            {
              message:
                error.message
            }
          );
        }
      );

    return operation;
  }

  async flush() {
    await this.writeQueue;
  }

  async recent({
    limit = 100,
    topic = null
  } = {}) {
    const normalizedLimit =
      positiveInteger(
        limit,
        100,
        1000
      );

    const normalizedTopic =
      topic
        ? normalizeTopic(topic)
        : null;

    try {
      const content =
        await fs.promises.readFile(
          this.filePath,
          'utf8'
        );

      const events =
        content
          .split('\n')
          .filter(Boolean)
          .map(parseJsonLine)
          .filter(Boolean);

      const filtered =
        normalizedTopic
          ? events.filter(
              (event) =>
                event.topic ===
                normalizedTopic
            )
          : events;

      return filtered.slice(
        -normalizedLimit
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  async stats() {
    let archiveCount = 0;

    try {
      const entries =
        await fs.promises.readdir(
          this.archiveDir,
          {
            withFileTypes: true
          }
        );

      archiveCount =
        entries.filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith(
              '.jsonl'
            )
        ).length;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return {
      filePath:
        this.filePath,
      currentBytes:
        await this.currentSize(),
      maximumBytes:
        this.maximumBytes,
      maximumArchives:
        this.maximumArchives,
      archiveCount,
      appendedCount:
        this.appendedCount,
      rotationCount:
        this.rotationCount,
      lastWriteAt:
        this.lastWriteAt,
      lastError:
        this.lastError
    };
  }
}

module.exports = {
  EventStore,
  parseJsonLine
};
