'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const os =
  require('os');
const path =
  require('path');

const {
  UserRepository
} = require(
  '../server/security/user-repository'
);

const {
  SessionService
} = require(
  '../server/security/session-service'
);

const {
  createApiV2AuthMiddleware
} = require(
  '../server/api/v2/auth'
);

function response() {
  return {
    statusCode:
      200,
    body:
      null,
    headers:
      {},
    cookieValue:
      null,
    set(
      name,
      value
    ) {
      this.headers[name] =
        value;
      return this;
    },
    status(code) {
      this.statusCode =
        code;
      return this;
    },
    json(body) {
      this.body =
        body;
      return this;
    },
    cookie(
      name,
      value
    ) {
      this.cookieValue =
        `${name}=${encodeURIComponent(value)}`;
    },
    clearCookie() {}
  };
}

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'session-csrf-'
      )
    );

  try {
    const repository =
      new UserRepository({
        filePath:
          path.join(
            tempRoot,
            'users.json'
          )
      });

    await repository
      .createUser({
        username:
          'admin',
        password:
          'csrf-test-password-123',
        role:
          'admin'
      });

    const sessions =
      new SessionService({
        userRepository:
          repository,
        cookieSecure:
          false
      });

    const loginResponse =
      response();

    await sessions.login(
      loginResponse,
      'admin',
      'csrf-test-password-123'
    );

    const request = {
      method:
        'POST',
      headers: {
        cookie:
          loginResponse
            .cookieValue
      },
      get(name) {
        return this.headers[
          String(name)
            .toLowerCase()
        ];
      },
      apiV2: {
        requestId:
          'csrf-test-request',
        startedAt:
          Date.now()
      }
    };

    const token =
      await sessions
        .csrfTokenForRequest(
          request
        );

    assert.strictEqual(
      typeof token,
      'string'
    );

    const middleware =
      createApiV2AuthMiddleware({
        runtimeProvider:
          () => ({
            apiTokenStore: {
              isConfigured:
                () => false,
              authenticate:
                () => null
            },
            sessionService:
              sessions
          })
      });

    let deniedNext =
      false;

    const deniedResponse =
      response();

    await middleware(
      request,
      deniedResponse,
      () => {
        deniedNext =
          true;
      }
    );

    assert.strictEqual(
      deniedNext,
      false
    );

    assert.strictEqual(
      deniedResponse
        .statusCode,
      403
    );

    let allowedNext =
      false;

    request.headers[
      'x-csrf-token'
    ] = token;

    await middleware(
      request,
      response(),
      () => {
        allowedNext =
          true;
      }
    );

    assert.strictEqual(
      allowedNext,
      true
    );

    console.log(
      'OK: sessionből származtatott CSRF token'
    );
    console.log(
      'OK: módosító session kérés CSRF nélkül tiltva'
    );
    console.log(
      'OK: érvényes CSRF fejléccel engedélyezve'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
