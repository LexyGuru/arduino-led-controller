'use strict';

const assert =
  require('assert');

async function main() {
  const {
    TauriCredentialVault,
    VolatileCredentialVault,
    createCredentialVault
  } =
    await import(
      '../desktop-tauri/src/api/runtime/credential-vault.mjs'
    );

  const values =
    new Map();

  const calls = [];

  const vault =
    new TauriCredentialVault({
      async invoke(
        command,
        arguments_
      ) {
        calls.push({
          command,
          arguments_
        });

        assert.strictEqual(
          arguments_.service,
          'arduino-led-controller'
        );

        assert.strictEqual(
          arguments_.account,
          'api-v2-bearer'
        );

        if (
          command ===
            'credential_status'
        ) {
          return {
            supported: true,
            available: true,
            backend:
              'macOS Keychain',
            platform:
              'macos',
            present:
              values.has(
                arguments_.account
              ),
            errorCode:
              null
          };
        }

        if (
          command ===
            'credential_get'
        ) {
          return values.get(
            arguments_.account
          ) ??
          null;
        }

        if (
          command ===
            'credential_set'
        ) {
          values.set(
            arguments_.account,
            arguments_.secret
          );
          return null;
        }

        if (
          command ===
            'credential_delete'
        ) {
          return values.delete(
            arguments_.account
          );
        }

        throw new Error(
          `Ismeretlen parancs: ${command}`
        );
      }
    });

  const initial =
    await vault.probe();

  assert.strictEqual(
    initial.available,
    true
  );

  assert.strictEqual(
    initial.platformBackend,
    'macOS Keychain'
  );

  await vault.setBearerToken(
    'x'.repeat(32)
  );

  assert.strictEqual(
    await vault.getBearerToken(),
    'x'.repeat(32)
  );

  assert.strictEqual(
    vault.snapshot()
      .bearerTokenPresent,
    true
  );

  await vault.clear();

  assert.strictEqual(
    await vault.getBearerToken(),
    null
  );

  for (
    const command
    of [
      'credential_status',
      'credential_set',
      'credential_get',
      'credential_delete'
    ]
  ) {
    assert.strictEqual(
      calls.some(
        (call) =>
          call.command ===
          command
      ),
      true,
      `Hiányzó invoke: ${command}`
    );
  }

  const fallback =
    createCredentialVault({
      invoke: null,
      allowPersistentBearer:
        true
    });

  assert.strictEqual(
    fallback instanceof
      VolatileCredentialVault,
    true
  );

  console.log(
    'OK: natív credential probe/get/set/delete'
  );

  console.log(
    'OK: fix service/account scope a frontendben'
  );

  console.log(
    'OK: natív invoke hiányában memóriás fallback'
  );
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );

    process.exitCode = 1;
  }
);
