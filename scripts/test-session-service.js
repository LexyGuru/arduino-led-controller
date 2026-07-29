'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  UserRepository,
  scryptPassword
} = require(
  '../server/security/user-repository'
);

const {
  SessionService
} = require(
  '../server/security/session-service'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'v5-session-service-'
      )
    );

  const filePath =
    path.join(
      tempRoot,
      'users.json'
    );

  try {
    const salt =
      crypto
        .randomBytes(16)
        .toString('hex');

    const passwordHash =
      await scryptPassword(
        'very-secure-password',
        salt
      );

    fs.writeFileSync(
      filePath,
      JSON.stringify({
        sessionSecret:
          'session-test-secret-1234567890abcdef',
        users: [
          {
            username:
              'admin',
            displayName:
              'Administrator',
            role:
              'admin',
            salt,
            passwordHash,
            sessionVersion:
              1,
            enabled:
              true
          }
        ]
      }),
      'utf8'
    );

    const published = [];

    const service =
      new SessionService({
        userRepository:
          new UserRepository({
            filePath
          }),
        cookieSecure:
          true,
        sessionDurationMs:
          60000,
        eventBus: {
          publish(
            topic,
            payload
          ) {
            published.push({
              topic,
              payload
            });
          }
        }
      });

    let cookie = null;

    const response = {
      cookie(
        name,
        value,
        options
      ) {
        cookie = {
          name,
          value,
          options
        };
      },
      clearCookie() {}
    };

    const login =
      await service.login(
        response,
        'ADMIN',
        'very-secure-password'
      );

    assert.strictEqual(
      login.user.username,
      'admin'
    );

    assert.strictEqual(
      cookie.name,
      'led_session'
    );

    assert.strictEqual(
      cookie.options.secure,
      true
    );

    const request = {
      headers: {
        cookie:
          `led_session=${encodeURIComponent(cookie.value)}`
      }
    };

    const user =
      await service.sessionUser(
        request
      );

    assert.strictEqual(
      user.displayName,
      'Administrator'
    );

    const principal =
      await service
        .principalForRequest(
          request
        );

    assert.strictEqual(
      principal.type,
      'user-session'
    );

    assert.strictEqual(
      principal.role,
      'admin'
    );

    const status =
      await service.status(
        request
      );

    assert.strictEqual(
      status.authenticated,
      true
    );

    service.logout(
      response,
      user
    );

    assert.deepStrictEqual(
      published.map(
        (event) =>
          event.topic
      ),
      [
        'auth.login',
        'auth.logout'
      ]
    );

    console.log(
      'OK: legacy-kompatibilis session cookie'
    );
    console.log(
      'OK: session principal API v2 hitelesítéshez'
    );
    console.log(
      'OK: login/logout események'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive: true,
        force: true
      }
    );
  }
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
