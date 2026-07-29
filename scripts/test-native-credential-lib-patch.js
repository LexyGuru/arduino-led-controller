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

const patch =
  fs.readFileSync(
    path.join(
      ROOT,
      'docs/v5/NATIVE_CREDENTIAL_BRIDGE_LIB_RS.patch'
    ),
    'utf8'
  );

assert.match(
  patch,
  /^diff --git /m
);

assert.match(
  patch,
  /^--- a\/desktop-tauri\/src-tauri\/src\/lib\.rs$/m
);

assert.match(
  patch,
  /^\+\+\+ b\/desktop-tauri\/src-tauri\/src\/lib\.rs$/m
);

assert.strictEqual(
  (
    patch.match(
      /credential_bridge::credential_/g
    ) ||
    []
  ).length,
  4
);

assert.strictEqual(
  (
    patch.match(
      /^-.*invoke_handler/mg
    ) ||
    []
  ).length,
  1
);

console.log(
  'OK: szabványos lib.rs Git patch'
);

console.log(
  'OK: pontosan négy credential parancs kerül a handlerbe'
);
