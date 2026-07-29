'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  ROLES
} = require('./roles');

const {
  SecurityServiceError
} = require('./security-error');

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function validateUsername(value) {
  const username =
    normalizeUsername(value);

  if (
    !/^[a-z0-9._-]{3,32}$/
      .test(username)
  ) {
    throw SecurityServiceError
      .invalidUsername({
        received: value
      });
  }

  return username;
}

function validatePassword(value) {
  if (
    typeof value !== 'string' ||
    value.length < 12
  ) {
    throw SecurityServiceError
      .invalidPassword();
  }

  return value;
}

function validateRole(value) {
  const role =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    !Object.values(
      ROLES
    ).includes(role)
  ) {
    throw SecurityServiceError
      .invalidRole({
        received: value
      });
  }

  return role;
}

function normalizeDisplayName(
  value,
  fallback
) {
  return String(
    value || fallback || ''
  )
    .trim()
    .slice(0, 64) ||
    fallback;
}

function publicUser(user) {
  return {
    username:
      user.username,
    displayName:
      user.displayName ||
      user.username,
    role:
      user.role,
    enabled:
      user.enabled !== false,
    createdAt:
      user.createdAt ||
      null,
    updatedAt:
      user.updatedAt ||
      null
  };
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
            derived.toString(
              'hex'
            )
          );
        }
      );
    }
  );
}

function activeAdminCount(
  users
) {
  return users.filter(
    (user) =>
      user.role ===
        ROLES.ADMIN &&
      user.enabled !== false
  ).length;
}

class UserRepository {
  constructor({
    filePath,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'A felhasználói adattár fájlútvonala kötelező.'
      );
    }

    this.filePath =
      filePath;
    this.logger =
      logger;
    this.eventBus =
      eventBus;
    this.writeQueue =
      Promise.resolve();
  }

  async readData() {
    try {
      const parsed =
        JSON.parse(
          await fs.promises
            .readFile(
              this.filePath,
              'utf8'
            )
        );

      return {
        sessionSecret:
          typeof parsed
            .sessionSecret ===
            'string'
            ? parsed
                .sessionSecret
            : null,
        users:
          Array.isArray(
            parsed.users
          )
            ? parsed.users
            : []
      };
    } catch (error) {
      if (
        error.code ===
        'ENOENT'
      ) {
        return {
          sessionSecret:
            null,
          users: []
        };
      }

      this.logger?.error?.(
        'Felhasználói adattár olvasási hiba.',
        {
          code:
            error.code
        }
      );

      throw error;
    }
  }

  enqueueWrite(operation) {
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

  async writeDataAtomic(
    data
  ) {
    await fs.promises.mkdir(
      path.dirname(
        this.filePath
      ),
      {
        recursive: true
      }
    );

    const temporary =
      `${this.filePath}.tmp-${process.pid}-${Date.now()}`;

    await fs.promises.writeFile(
      temporary,
      `${JSON.stringify(
        data,
        null,
        2
      )}\n`,
      {
        encoding:
          'utf8',
        mode:
          0o600
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
  }

  ensureSessionSecret(
    data
  ) {
    if (
      typeof data
        .sessionSecret ===
        'string' &&
      data.sessionSecret
        .length >= 32
    ) {
      return data;
    }

    return {
      ...data,
      sessionSecret:
        crypto
          .randomBytes(32)
          .toString('hex')
    };
  }

  async setupNeeded() {
    const data =
      await this.readData();

    return (
      data.users.length ===
      0
    );
  }

  async listUsers() {
    const data =
      await this.readData();

    return data.users
      .map(publicUser)
      .sort(
        (left, right) =>
          left.username
            .localeCompare(
              right.username
            )
      );
  }

  async findByUsername(
    value
  ) {
    const username =
      normalizeUsername(
        value
      );

    const data =
      await this.readData();

    const user =
      data.users.find(
        (candidate) =>
          normalizeUsername(
            candidate
              ?.username
          ) ===
          username
      );

    return {
      data,
      user:
        user ||
        null
    };
  }

  async verifyCredentials(
    username,
    password
  ) {
    const {
      data,
      user
    } =
      await this
        .findByUsername(
          username
        );

    if (
      data.users.length ===
      0
    ) {
      throw SecurityServiceError
        .setupRequired();
    }

    if (!user) {
      throw SecurityServiceError
        .invalidCredentials();
    }

    if (
      user.enabled ===
      false
    ) {
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

  async createUser({
    username,
    password,
    displayName,
    role =
      ROLES.OPERATOR,
    enabled = true
  } = {}) {
    return this.enqueueWrite(
      async () => {
        const normalizedUsername =
          validateUsername(
            username
          );
        const normalizedPassword =
          validatePassword(
            password
          );
        const normalizedRole =
          validateRole(
            role
          );

        let data =
          this.ensureSessionSecret(
            await this.readData()
          );

        if (
          data.users.some(
            (user) =>
              normalizeUsername(
                user.username
              ) ===
              normalizedUsername
          )
        ) {
          throw SecurityServiceError
            .userExists(
              normalizedUsername
            );
        }

        const salt =
          crypto
            .randomBytes(16)
            .toString('hex');

        const now =
          new Date()
            .toISOString();

        const user = {
          username:
            normalizedUsername,
          displayName:
            normalizeDisplayName(
              displayName,
              normalizedUsername
            ),
          role:
            normalizedRole,
          salt,
          passwordHash:
            await scryptPassword(
              normalizedPassword,
              salt
            ),
          sessionVersion:
            1,
          enabled:
            enabled !== false,
          createdAt:
            now,
          updatedAt:
            now
        };

        data = {
          ...data,
          users: [
            ...data.users,
            user
          ]
        };

        await this
          .writeDataAtomic(
            data
          );

        this.eventBus
          ?.publish?.(
            'user.created',
            publicUser(
              user
            )
          );

        return publicUser(
          user
        );
      }
    );
  }

  async updateUser(
    username,
    patch = {}
  ) {
    return this.enqueueWrite(
      async () => {
        const normalizedUsername =
          normalizeUsername(
            username
          );

        const data =
          await this.readData();

        const index =
          data.users.findIndex(
            (user) =>
              normalizeUsername(
                user.username
              ) ===
              normalizedUsername
          );

        if (index < 0) {
          throw SecurityServiceError
            .userNotFound(
              normalizedUsername
            );
        }

        const current =
          data.users[index];

        const nextRole =
          patch.role ===
            undefined
            ? current.role
            : validateRole(
                patch.role
              );

        const nextEnabled =
          patch.enabled ===
            undefined
            ? current.enabled !==
              false
            : patch.enabled ===
              true;

        const removesActiveAdmin =
          current.role ===
            ROLES.ADMIN &&
          current.enabled !==
            false &&
          (
            nextRole !==
              ROLES.ADMIN ||
            !nextEnabled
          );

        if (
          removesActiveAdmin &&
          activeAdminCount(
            data.users
          ) <= 1
        ) {
          throw SecurityServiceError
            .lastAdmin();
        }

        const securityChanged =
          nextRole !==
            current.role ||
          nextEnabled !==
            (
              current.enabled !==
              false
            );

        const updated = {
          ...current,
          displayName:
            patch.displayName ===
              undefined
              ? current
                  .displayName
              : normalizeDisplayName(
                  patch
                    .displayName,
                  current
                    .username
                ),
          role:
            nextRole,
          enabled:
            nextEnabled,
          sessionVersion:
            securityChanged
              ? Number(
                  current
                    .sessionVersion ||
                  0
                ) + 1
              : Number(
                  current
                    .sessionVersion ||
                  1
                ),
          updatedAt:
            new Date()
              .toISOString()
        };

        const users =
          [...data.users];

        users[index] =
          updated;

        await this
          .writeDataAtomic({
            ...data,
            users
          });

        this.eventBus
          ?.publish?.(
            'user.updated',
            publicUser(
              updated
            )
          );

        return publicUser(
          updated
        );
      }
    );
  }

  async changePassword(
    username,
    password
  ) {
    return this.enqueueWrite(
      async () => {
        const normalizedUsername =
          normalizeUsername(
            username
          );
        const normalizedPassword =
          validatePassword(
            password
          );

        const data =
          await this.readData();

        const index =
          data.users.findIndex(
            (user) =>
              normalizeUsername(
                user.username
              ) ===
              normalizedUsername
          );

        if (index < 0) {
          throw SecurityServiceError
            .userNotFound(
              normalizedUsername
            );
        }

        const current =
          data.users[index];

        const salt =
          crypto
            .randomBytes(16)
            .toString('hex');

        const updated = {
          ...current,
          salt,
          passwordHash:
            await scryptPassword(
              normalizedPassword,
              salt
            ),
          sessionVersion:
            Number(
              current
                .sessionVersion ||
              0
            ) + 1,
          updatedAt:
            new Date()
              .toISOString()
        };

        const users =
          [...data.users];

        users[index] =
          updated;

        await this
          .writeDataAtomic({
            ...data,
            users
          });

        this.eventBus
          ?.publish?.(
            'user.password-changed',
            {
              username:
                normalizedUsername
            }
          );

        return {
          username:
            normalizedUsername,
          passwordChanged:
            true,
          sessionsInvalidated:
            true
        };
      }
    );
  }

  async removeUser(
    username
  ) {
    return this.enqueueWrite(
      async () => {
        const normalizedUsername =
          normalizeUsername(
            username
          );

        const data =
          await this.readData();

        const user =
          data.users.find(
            (candidate) =>
              normalizeUsername(
                candidate
                  .username
              ) ===
              normalizedUsername
          );

        if (!user) {
          throw SecurityServiceError
            .userNotFound(
              normalizedUsername
            );
        }

        if (
          user.role ===
            ROLES.ADMIN &&
          user.enabled !==
            false &&
          activeAdminCount(
            data.users
          ) <= 1
        ) {
          throw SecurityServiceError
            .lastAdmin();
        }

        await this
          .writeDataAtomic({
            ...data,
            users:
              data.users.filter(
                (candidate) =>
                  normalizeUsername(
                    candidate
                      .username
                  ) !==
                  normalizedUsername
              )
          });

        this.eventBus
          ?.publish?.(
            'user.removed',
            {
              username:
                normalizedUsername
            }
          );

        return {
          removed:
            true,
          username:
            normalizedUsername
        };
      }
    );
  }
}

module.exports = {
  UserRepository,
  activeAdminCount,
  normalizeDisplayName,
  normalizeUsername,
  publicUser,
  scryptPassword,
  timingSafeHexEquals,
  validatePassword,
  validateRole,
  validateUsername
};
