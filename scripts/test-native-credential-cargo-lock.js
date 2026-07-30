'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const lockPath =
  path.join(
    ROOT,
    'desktop-tauri/src-tauri/Cargo.lock'
  );

assert.strictEqual(
  fs.existsSync(
    lockPath
  ),
  true,
  'Hiányzik a Cargo.lock. Futtasd: cd desktop-tauri/src-tauri && cargo check'
);

const lock =
  fs.readFileSync(
    lockPath,
    'utf8'
  );

assert.match(
  lock,
  /name = "keyring"[\s\S]*?version = "4\.1\.5"/
);

assert.match(
  lock,
  /name = "zeroize"[\s\S]*?version = "1\.9\.0"/
);

console.log(
  'OK: Cargo.lock tartalmazza a keyring 4.1.5 verziót'
);

console.log(
  'OK: Cargo.lock tartalmazza a zeroize 1.9.0 verziót'
);
