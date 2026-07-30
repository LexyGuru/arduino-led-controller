'use strict';

const assert = require('assert');

async function main() {
  const {
    ServerProfileStore,
    normalizeBaseUrl
  } =
    await import(
      '../desktop-tauri/src/api/runtime/server-profile-store.mjs'
    );

  const values =
    new Map();

  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };

  const store =
    new ServerProfileStore({
      storage
    });

  const saved =
    store.save({
      id: 'home',
      label: 'Otthoni szerver',
      baseUrl:
        'https://led.local:3443/',
      authMode:
        'bearer'
    });

  assert.strictEqual(
    saved.baseUrl,
    'https://led.local:3443'
  );

  assert.strictEqual(
    store.load().authMode,
    'bearer'
  );

  assert.throws(
    () =>
      normalizeBaseUrl(
        'ftp://led.local'
      ),
    /HTTP vagy HTTPS/
  );

  assert.throws(
    () =>
      normalizeBaseUrl(
        'https://user:pass@led.local'
      ),
    /nem tartalmazhat/
  );

  console.log(
    'OK: biztonságos desktop szerverprofil'
  );
  console.log(
    'OK: URL protokoll és credential validáció'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
