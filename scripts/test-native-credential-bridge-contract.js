'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(
    path.join(ROOT, relative),
    'utf8'
  );
}

const cargo = read(
  'desktop-tauri/src-tauri/Cargo.toml'
);

const bridge = read(
  'desktop-tauri/src-tauri/src/credential_bridge.rs'
);

const lib = read(
  'desktop-tauri/src-tauri/src/lib.rs'
);

const main = read(
  'desktop-tauri/src/main.tsx'
);

const factory = read(
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

assert.match(
  lib,
  /mod credential_bridge;/
);

assert.match(
  lib,
  /fn runtime_capabilities\s*\(/
);

assert.match(
  lib,
  /async fn firmware_update\s*\(/
);

assert.match(
  lib,
  /tauri::generate_handler!\s*\[/
);

for (
  const command of [
    'credential_status',
    'credential_get',
    'credential_set',
    'credential_delete'
  ]
) {
  assert.match(
    bridge,
    new RegExp(
      `pub async fn ${command}`
    )
  );

  assert.match(
    lib,
    new RegExp(
      `credential_bridge::${command}`
    )
  );
}

const handlerBlock =
  lib.match(
    /tauri::generate_handler!\s*\[[\s\S]*?\]\s*\)/
  )?.[0] || '';

assert.ok(
  handlerBlock,
  'A Tauri invoke handler blokk nem található.'
);

for (
  const command of [
    'credential_status',
    'credential_get',
    'credential_set',
    'credential_delete'
  ]
) {
  const occurrences = (
    handlerBlock.match(
      new RegExp(
        `credential_bridge::${command}`,
        'g'
      )
    ) || []
  ).length;

  assert.strictEqual(
    occurrences,
    1,
    `${command} pontosan egyszer szerepeljen az invoke handlerben.`
  );
}

/*
 * Fix service-scope.
 */
assert.match(
  bridge,
  /ALLOWED_SERVICE[\s\S]*arduino-led-controller/
);

/*
 * A régi API v2 bearer account megmarad migrációs és
 * visszamenőleges kompatibilitási célból.
 */
assert.match(
  bridge,
  /LEGACY_ACCOUNT[\s\S]*api-v2-bearer/
);

/*
 * Az új Direct Mode credential accountok profilhoz kötöttek.
 */
assert.match(
  bridge,
  /DIRECT_PREFIX[\s\S]*direct:/
);

assert.match(
  bridge,
  /account\.starts_with\(DIRECT_PREFIX\)/
);

assert.match(
  bridge,
  /account\.ends_with\(":device-key"\)/
);

assert.match(
  bridge,
  /account\.ends_with\(":ota-password"\)/
);

assert.match(
  bridge,
  /account\s*!=\s*LEGACY_ACCOUNT\s*&&\s*!valid_direct/
);

/*
 * A profilcredential belső segédfüggvényei.
 *
 * A törlés és a status továbbra is a validált általános
 * credential_delete / credential_status Tauri parancson keresztül működik.
 */
for (
  const command of [
    'get_profile_secret',
    'set_profile_secret'
  ]
) {
  assert.match(
    bridge,
    new RegExp(
      `pub async fn ${command}`
    )
  );
}

for (
  const command of [
    'credential_status',
    'credential_get',
    'credential_set',
    'credential_delete'
  ]
) {
  assert.match(
    bridge,
    new RegExp(
      `pub async fn ${command}`
    )
  );
}

/*
 * Natív kulcstári és secret-kezelési követelmények.
 */
assert.match(
  bridge,
  /spawn_blocking/
);

assert.match(
  bridge,
  /Zeroizing/
);

assert.match(
  bridge,
  /KeyringError::NoEntry/
);

assert.match(
  bridge,
  /MAX_SECRET_BYTES:\s*usize\s*=\s*8192/
);

assert.match(
  bridge,
  /MIN_SECRET_BYTES:\s*usize\s*=\s*16/
);

assert.match(
  bridge,
  /validate_scope/
);

assert.match(
  bridge,
  /validate_secret/
);

/*
 * Frontend Tauri invoke és egyszeres bearer-token mentés.
 */
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
  )?.[0] || '';

assert.strictEqual(
  (
    setBlock.match(
      /credentialVault[\s\S]{0,80}\.setBearerToken/g
    ) || []
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
  'OK: négy legacy Tauri credential parancs a tényleges lib.rs handlerben'
);

console.log(
  'OK: legacy api-v2-bearer account megőrizve'
);

console.log(
  'OK: profilonkénti Direct Device Key és OTA password account scope'
);

console.log(
  'OK: frontend Tauri invoke és egyszeres tokenmentés'
);
