'use strict';

const assert = require('assert');

async function main() {
  const {
    DesktopAuthController
  } =
    await import(
      '../desktop-tauri/src/api/runtime/auth-controller.mjs'
    );

  const vault = {
    token: null,
    async getBearerToken() {
      return this.token;
    },
    async setBearerToken(value) {
      this.token = value;
    },
    async clearBearerToken() {
      this.token = null;
    },
    async clear() {
      this.token = null;
    },
    snapshot() {
      return {
        persistent: false
      };
    }
  };

  const calls = [];

  const client = {
    async postAuthLogin(options) {
      calls.push(
        ['login', options]
      );

      return {
        success: true,
        data: {
          principal: {
            subject:
              'admin'
          }
        }
      };
    },
    async getAuthCsrf() {
      calls.push(
        ['csrf']
      );

      return {
        success: true,
        data: {
          csrfToken:
            'csrf-token'
        }
      };
    },
    async getAuthStatus() {
      return {
        success: true,
        data: {
          principal: {
            subject:
              'admin'
          }
        }
      };
    },
    async postAuthLogout() {
      calls.push(
        ['logout']
      );
    }
  };

  const auth =
    new DesktopAuthController({
      client,
      credentialVault:
        vault
    });

  await auth.login({
    username: 'admin',
    password: 'secret'
  });

  assert.strictEqual(
    auth.currentCsrfToken(),
    'csrf-token'
  );

  assert.strictEqual(
    auth.snapshot()
      .authenticated,
    true
  );

  await auth.logout();

  assert.strictEqual(
    auth.snapshot()
      .authenticated,
    false
  );

  console.log(
    'OK: session login/logout és CSRF kezelés'
  );
  console.log(
    'OK: auth state és credential törlés'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
