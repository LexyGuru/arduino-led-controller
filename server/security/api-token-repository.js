'use strict';

const fs = require('fs');
const path = require('path');

const {
  SecurityServiceError
} = require('./security-error');

const TOKEN_ID_PATTERN =
  /^tok_[A-Za-z0-9_-]{8,96}$/;

const TOKEN_HASH_PATTERN =
  /^[a-f0-9]{64}$/i;

function normalizeManagedTokenRecord(
  input
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new SecurityServiceError(
      500,
      'API_TOKEN_RECORD_INVALID',
      'Érvénytelen API-token rekord.'
    );
  }

  const id =
    String(input.id || '').trim();

  const tokenHash =
    String(input.tokenHash || '')
      .trim()
      .toLowerCase();

  if (!TOKEN_ID_PATTERN.test(id)) {
    throw new SecurityServiceError(
      500,
      'API_TOKEN_ID_INVALID',
      'Érvénytelen API-token azonosító.',
      { id }
    );
  }

  if (!TOKEN_HASH_PATTERN.test(tokenHash)) {
    throw new SecurityServiceError(
      500,
      'API_TOKEN_HASH_INVALID',
      'Érvénytelen API-token lenyomat.',
      { id }
    );
  }

  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt).toISOString()
    : null;

  return Object.freeze({
    id,
    label:
      String(input.label || id)
        .trim()
        .slice(0, 96),
    tokenHash,
    role:
      String(input.role || 'viewer')
        .trim()
        .toLowerCase(),
    enabled:
      input.enabled !== false,
    createdAt:
      new Date(
        input.createdAt || Date.now()
      ).toISOString(),
    updatedAt:
      new Date(
        input.updatedAt ||
        input.createdAt ||
        Date.now()
      ).toISOString(),
    expiresAt,
    rotatedFrom:
      input.rotatedFrom
        ? String(input.rotatedFrom)
        : null
  });
}

class ApiTokenRepository {
  constructor({
    filePath,
    logger = null,
    maximumRecords = 100
  } = {}) {
    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'Az API-token repository fájlútvonala kötelező.'
      );
    }

    this.filePath = filePath;
    this.logger = logger;
    this.maximumRecords = Math.max(
      1,
      Number(maximumRecords) || 100
    );
    this.writeQueue = Promise.resolve();
  }

  readSync() {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(
          this.filePath,
          'utf8'
        )
      );

      const records = Array.isArray(parsed)
        ? parsed
        : parsed.tokens;

      if (!Array.isArray(records)) {
        throw new Error(
          'A tokens mező nem tömb.'
        );
      }

      return records.map(
        normalizeManagedTokenRecord
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      this.logger?.error?.(
        'API-token repository olvasási hiba.',
        {
          code: error.code,
          message: error.message
        }
      );

      throw new SecurityServiceError(
        500,
        'API_TOKEN_REPOSITORY_READ_FAILED',
        'Az API-token repository nem olvasható.',
        null,
        { cause: error }
      );
    }
  }

  async writeAtomic(records) {
    const normalized = records.map(
      normalizeManagedTokenRecord
    );

    if (
      normalized.length >
      this.maximumRecords
    ) {
      throw new SecurityServiceError(
        409,
        'API_TOKEN_LIMIT_REACHED',
        `Legfeljebb ${this.maximumRecords} kezelt API-token tárolható.`
      );
    }

    const operation = async () => {
      await fs.promises.mkdir(
        path.dirname(this.filePath),
        { recursive: true }
      );

      const temporary =
        `${this.filePath}.tmp-${process.pid}-${Date.now()}`;

      const document = {
        version: 1,
        updatedAt:
          new Date().toISOString(),
        tokens: normalized
      };

      await fs.promises.writeFile(
        temporary,
        `${JSON.stringify(document, null, 2)}\n`,
        {
          encoding: 'utf8',
          mode: 0o600
        }
      );

      await fs.promises.rename(
        temporary,
        this.filePath
      );

      try {
        await fs.promises.chmod(
          this.filePath,
          0o600
        );
      } catch (_) {
        // Platformfüggő.
      }

      return normalized;
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
}

module.exports = {
  ApiTokenRepository,
  TOKEN_HASH_PATTERN,
  TOKEN_ID_PATTERN,
  normalizeManagedTokenRecord
};
