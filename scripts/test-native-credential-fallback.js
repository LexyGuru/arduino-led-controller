'use strict';

const assert =
  require('assert');

async function main() {
  const {
    TauriCredentialVault
  } =
    await import(
      '../desktop-tauri/src/api/runtime/credential-vault.mjs'
    );

  const vault =
    new TauriCredentialVault({
      async invoke(
        command
      ) {
        if (
          command ===
            'credential_status'
        ) {
          return {
            supported: true,
            available: false,
            backend:
              'Linux Secret Service',
            platform:
              'linux',
            present:
              null,
            errorCode:
              'CREDENTIAL_STORE_ERROR'
          };
        }

        throw new Error(
          'A natív kulcstár nem érhető el.'
        );
      }
    });

  const status =
    await vault.probe();

  assert.strictEqual(
    status.fallbackActive,
    true
  );

  await vault.setBearerToken(
    'm'.repeat(32)
  );

  assert.strictEqual(
    await vault.getBearerToken(),
    'm'.repeat(32)
  );

  const snapshot =
    vault.snapshot();

  assert.strictEqual(
    snapshot.persistent,
    false
  );

  assert.strictEqual(
    snapshot.bearerTokenPresent,
    true
  );

  console.log(
    'OK: natív kulcstárhiba után működő memóriás fallback'
  );

  console.log(
    'OK: fallback állapot látható a desktop felületnek'
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
