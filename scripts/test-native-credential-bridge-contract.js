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

function read(relative) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

const cargo =
  read(
    'desktop-tauri/src-tauri/Cargo.toml'
  );

const rust =
  read(
    'desktop-tauri/src-tauri/src/credential_bridge.rs'
  );

const patch =
  read(
    'docs/v5/NATIVE_CREDENTIAL_BRIDGE_LIB_RS.patch'
  );

const main =
  read(
    'desktop-tauri/src/main.tsx'
  );

const factory =
  read(
    'desktop-tauri/src/api/create-desktop-api.ts'
  );

assert.match(
  cargo,
  /keyring\s*=\s*\{[^}]*=4\.1\.5/
);

assert.match(
  cargo,
  /zeroize\s*=\s*"=1\.9\.0"/
);

for (
  const command
  of [
    'credential_status',
    'credential_get',
    'credential_set',
    'credential_delete'
  ]
) {
  assert.match(
    rust,
    new RegExp(
      `pub async fn ${command}`
    )
  );

  assert.match(
    patch,
    new RegExp(
      `credential_bridge::${command}`
    )
  );
}

assert.match(
  rust,
  /ALLOWED_SERVICE[\s\S]*arduino-led-controller/
);

assert.match(
  rust,
  /ALLOWED_ACCOUNT[\s\S]*api-v2-bearer/
);

assert.match(
  rust,
  /spawn_blocking/
);

assert.match(
  rust,
  /Zeroizing/
);

assert.match(
  rust,
  /KeyringError::NoEntry/
);

assert.match(
  rust,
  /MAX_SECRET_BYTES:\s*usize\s*=\s*8192/
);

assert.match(
  patch,
  /mod credential_bridge;/
);

assert.match(
  patch,
  /runtime_capabilities/
);

assert.match(
  patch,
  /firmware_update/
);

assert.match(
  main,
  /@tauri-apps\/api\/core/
);

assert.match(
  main,
  /__TAURI_INTERNALS__/
);

assert.match(
  main,
  /allowPersistentBearer/
);

const setBlock =
  factory.match(
    /async setBearerToken\([\s\S]*?\n    },/
  )?.[0] ||
  '';

assert.strictEqual(
  (
    setBlock.match(
      /credentialVault[\s\S]{0,80}\.setBearerToken/g
    ) ||
    []
  ).length,
  0,
  'A factory nem írhatja kétszer közvetlenül a vaultot.'
);

assert.match(
  setBlock,
  /auth[\s\S]*useBearerToken/
);

console.log(
  'OK: Rust keyring és zeroize függőségi szerződés'
);

console.log(
  'OK: négy Tauri credential parancs és központi handler patch'
);

console.log(
  'OK: frontend Tauri invoke és egyszeres tokenmentés'
);
