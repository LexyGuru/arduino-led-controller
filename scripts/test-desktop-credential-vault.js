'use strict';

const assert = require('assert');

async function main() {
  const {
    VolatileCredentialVault,
    TauriCredentialVault
  } =
    await import(
      '../desktop-tauri/src/api/runtime/credential-vault.mjs'
    );

  const volatile =
    new VolatileCredentialVault();

  await volatile.setBearerToken(
    'x'.repeat(32)
  );

  assert.strictEqual(
    await volatile.getBearerToken(),
    'x'.repeat(32)
  );

  assert.strictEqual(
    volatile.snapshot().persistent,
    false
  );

  const calls = [];
  const values = new Map();

  const persistent =
    new TauriCredentialVault({
      async invoke(command, args) {
        calls.push({
          command,
          args
        });

        if (
          command ===
          'credential_set'
        ) {
          values.set(
            args.account,
            args.secret
          );
          return null;
        }

        if (
          command ===
          'credential_get'
        ) {
          return values.get(
            args.account
          ) ?? null;
        }

        if (
          command ===
          'credential_delete'
        ) {
          values.delete(
            args.account
          );
          return null;
        }

        throw new Error(
          `Ismeretlen parancs: ${command}`
        );
      }
    });

  await persistent.setBearerToken(
    'y'.repeat(32)
  );

  assert.strictEqual(
    await persistent.getBearerToken(),
    'y'.repeat(32)
  );

  await persistent.clear();

  assert.strictEqual(
    await persistent.getBearerToken(),
    null
  );

  assert.strictEqual(
    calls.some(
      (call) =>
        call.command ===
        'credential_delete'
    ),
    true
  );

  console.log(
    'OK: Bearer token alapból csak memóriában'
  );
  console.log(
    'OK: opcionális Tauri credential bridge'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
