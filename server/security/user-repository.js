'use strict';

const crypto = require('crypto');
const fs = require('fs');

const {
  SecurityServiceError
} = require('./security-error');

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function timingSafeHexEquals(
  left,
  right
) {
  const leftBuffer =
    Buffer.from(
      String(left || ''),
      'hex'
    );

  const rightBuffer =
    Buffer.from(
      String(right || ''),
      'hex'
    );

  if (
    leftBuffer.length === 0 ||
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

function scryptPassword(
  password,
  salt
) {
  return new Promise(
    (resolve, reject) => {
      crypto.scrypt(
        String(password || ''),
        String(salt || ''),
        64,
        (error, derived) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(
            derived.toString('hex')
          );
        }
      );
    }
  );
}

class UserRepository {
  constructor({
    filePath,
    logger = null
  } = {}) {
    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'A felhasználói adattár fájlútvonala kötelező.'
      );
    }

    this.filePath = filePath;
    this.logger = logger;
  }

  async readData() {
    try {
      const parsed = JSON.parse(
        await fs.promises.readFile(
          this.filePath,
          'utf8'
        )
      );

      return {
        sessionSecret:
          typeof parsed.sessionSecret ===
            'string'
            ? parsed.sessionSecret
            : null,
        users:
          Array.isArray(parsed.users)
            ? parsed.users
            : []
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          sessionSecret: null,
          users: []
        };
      }

      this.logger?.error?.(
        'Felhasználói adattár olvasási hiba.',
        {
          code: error.code
        }
      );

      throw error;
    }
  }

  async setupNeeded() {
    const data =
      await this.readData();

    return data.users.length === 0;
  }

  async findByUsername(value) {
    const username =
      normalizeUsername(value);

    const data =
      await this.readData();

    const user =
      data.users.find(
        (candidate) =>
          normalizeUsername(
            candidate?.username
          ) === username
      );

    return {
      data,
      user: user || null
    };
  }

  async verifyCredentials(
    username,
    password
  ) {
    const {
      data,
      user
    } = await this.findByUsername(
      username
    );

    if (data.users.length === 0) {
      throw SecurityServiceError
        .setupRequired();
    }

    if (!user) {
      throw SecurityServiceError
        .invalidCredentials();
    }

    if (user.enabled === false) {
      throw SecurityServiceError
        .userDisabled();
    }

    const passwordHash =
      await scryptPassword(
        password,
        user.salt
      );

    if (
      !timingSafeHexEquals(
        passwordHash,
        user.passwordHash
      )
    ) {
      throw SecurityServiceError
        .invalidCredentials();
    }

    return {
      data,
      user
    };
  }
}

module.exports = {
  UserRepository,
  normalizeUsername,
  scryptPassword,
  timingSafeHexEquals
};
