'use strict';

const fs = require('fs');
const path = require('path');

const SENSITIVE_KEYS =
  /password|secret|token|authorization|cookie|api[-_]?key|ota/i;

function redactValue(
  value,
  key = '',
  depth = 0
) {
  if (
    SENSITIVE_KEYS.test(
      String(key)
    )
  ) {
    return '[REDACTED]';
  }

  if (depth > 6) {
    return '[MAX_DEPTH]';
  }

  if (Array.isArray(value)) {
    return value.map(
      (item) =>
        redactValue(
          item,
          '',
          depth + 1
        )
    );
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .map(
          ([nestedKey, nestedValue]) => [
            nestedKey,
            redactValue(
              nestedValue,
              nestedKey,
              depth + 1
            )
          ]
        )
    );
  }

  if (
    typeof value === 'string'
  ) {
    return value.slice(
      0,
      2000
    );
  }

  return value;
}

class AuditLog {
  constructor({
    filePath,
    logger = null,
    eventBus = null,
    maximumBytes =
      5 * 1024 * 1024,
    maximumArchives = 5
  } = {}) {
    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'Az audit fájlútvonala kötelező.'
      );
    }

    this.filePath = filePath;
    this.logger = logger;
    this.eventBus = eventBus;
    this.maximumBytes =
      Math.max(
        64 * 1024,
        Number(maximumBytes) ||
          5 * 1024 * 1024
      );
    this.maximumArchives =
      Math.max(
        1,
        Math.min(
          50,
          Number(maximumArchives) || 5
        )
      );
    this.rotationCount = 0;
    this.queue =
      Promise.resolve();
    this.recordCount = 0;
    this.lastRecordAt = null;
    this.lastError = null;
  }

  async ensureDirectory() {
    await fs.promises.mkdir(
      path.dirname(
        this.filePath
      ),
      {
        recursive: true
      }
    );
  }

  async rotateIfNeeded(
    nextBytes
  ) {
    let currentBytes = 0;

    try {
      currentBytes =
        (
          await fs.promises.stat(
            this.filePath
          )
        ).size;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (
      currentBytes + nextBytes <=
      this.maximumBytes
    ) {
      return;
    }

    const rotated =
      `${this.filePath}.${Date.now()}.jsonl`;

    try {
      await fs.promises.rename(
        this.filePath,
        rotated
      );
      this.rotationCount += 1;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const directory =
      path.dirname(this.filePath);
    const prefix =
      `${path.basename(this.filePath)}.`;

    const entries =
      await fs.promises.readdir(
        directory,
        {
          withFileTypes: true
        }
      );

    const archives =
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.startsWith(prefix) &&
            entry.name.endsWith('.jsonl')
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
          directory,
          stale
        ),
        {
          force: true
        }
      );
    }
  }

  record({
    action,
    principal = null,
    request = null,
    details = {}
  }) {
    const entry = {
      timestamp:
        new Date().toISOString(),
      action:
        String(action || 'unknown')
          .trim()
          .slice(0, 160),
      principal:
        principal
          ? {
              subject:
                principal.subject ||
                principal.username ||
                'unknown',
              type:
                principal.type ||
                'unknown',
              role:
                principal.role ||
                null
            }
          : null,
      request:
        request
          ? {
              requestId:
                request.apiV2
                  ?.requestId ||
                null,
              method:
                request.method ||
                null,
              path:
                request.originalUrl ||
                request.url ||
                null,
              ip:
                request.ip ||
                request.socket
                  ?.remoteAddress ||
                null,
              userAgent:
                request.get?.(
                  'User-Agent'
                ) ||
                request.headers
                  ?.['user-agent'] ||
                null
            }
          : null,
      details:
        redactValue(
          details
        )
    };

    const operation =
      this.queue.then(
        async () => {
          await this.ensureDirectory();

          const line =
            `${JSON.stringify(entry)}\n`;

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

          this.recordCount += 1;
          this.lastRecordAt =
            entry.timestamp;
          this.lastError = null;

          this.eventBus?.publish?.(
            'security.audit',
            {
              action:
                entry.action,
              principal:
                entry.principal
            },
            {
              persisted:
                true
            }
          );

          return entry;
        }
      );

    this.queue =
      operation.catch(
        (error) => {
          this.lastError =
            error.message;

          this.logger?.error?.(
            'Audit napló írási hiba.',
            {
              message:
                error.message
            }
          );
        }
      );

    return operation;
  }

  async recent(limit = 100) {
    const normalizedLimit =
      Math.max(
        1,
        Math.min(
          500,
          Number(limit) || 100
        )
      );

    try {
      const content =
        await fs.promises.readFile(
          this.filePath,
          'utf8'
        );

      return content
        .split('\n')
        .filter(Boolean)
        .slice(
          -normalizedLimit
        )
        .map(
          (line) => {
            try {
              return JSON.parse(
                line
              );
            } catch (_) {
              return null;
            }
          }
        )
        .filter(Boolean);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  async flush() {
    await this.queue;
  }

  async stats() {
    let currentBytes = 0;

    try {
      currentBytes =
        (
          await fs.promises.stat(
            this.filePath
          )
        ).size;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return {
      filePath:
        this.filePath,
      currentBytes,
      maximumBytes:
        this.maximumBytes,
      maximumArchives:
        this.maximumArchives,
      rotationCount:
        this.rotationCount,
      recordCount:
        this.recordCount,
      lastRecordAt:
        this.lastRecordAt,
      lastError:
        this.lastError
    };
  }
}

module.exports = {
  AuditLog,
  SENSITIVE_KEYS,
  redactValue
};
