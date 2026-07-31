'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST =
  'docs/v5/PACKAGE_MANIFEST_V14_1_DIRECT_CONNECTION_UI.json';

function read(relativePath) {
  return fs.readFileSync(
    path.join(ROOT, relativePath),
    'utf8'
  );
}

function sha256(relativePath) {
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        path.join(ROOT, relativePath)
      )
    )
    .digest('hex');
}

function main() {
  const app = read(
    'desktop-tauri/src/App.tsx'
  );
  const sidebar = read(
    'desktop-tauri/src/components/Sidebar.tsx'
  );
  const settings = read(
    'desktop-tauri/src/pages/SettingsPage.tsx'
  );
  const controller = read(
    'desktop-tauri/src/hooks/useController.ts'
  );
  const types = read(
    'desktop-tauri/src/types/index.ts'
  );
  const checklist = read(
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md'
  );
  const migratedLegacyContract = read(
    'scripts/test-desktop-v5-ui-contract.js'
  );

  assert.ok(
    !app.includes('V5SystemPage')
  );
  assert.ok(
    !app.includes("page ===\n                'system'")
  );
  assert.ok(
    !sidebar.includes('ServerCog')
  );
  assert.ok(
    !sidebar.includes("'system'")
  );
  assert.ok(
    sidebar.includes(
      "label: 'Arduino kapcsolat'"
    )
  );
  assert.ok(
    !types.includes("| 'system'")
  );

  assert.ok(
    !settings.includes('V5 SZERVERKAPCSOLAT'),
    'A V5 szerverpanel nem jelenhet meg a direct beállításokban'
  );
  assert.ok(
    !settings.includes('authMode'),
    'A direct beállítások nem tartalmazhatnak szerver-auth módot'
  );
  assert.ok(
    !settings.includes('username'),
    'A direct beállítások nem tartalmazhatnak felhasználónév mezőt'
  );
  assert.ok(
    !settings.includes('passwordLogin'),
    'A direct beállítások nem tartalmazhatnak session jelszómezőt'
  );

  for (const required of [
    'KÖZVETLEN ARDUINO KAPCSOLAT',
    'Helyi Arduino IP vagy host',
    'Távoli Arduino DDNS vagy IP',
    'Távoli HTTP-port',
    'Titkos API-útvonal',
    'Arduino eszközkulcs',
    'API_PRIVATE_PATH',
    'API_SHARED_SECRET',
    'Mentés és Arduino teszt',
    'beta-lexyguruhome.ddns.net',
    '10.0.0.117'
  ]) {
    assert.ok(
      settings.includes(required),
      `Hiányzó Settings UI szerződés: ${required}`
    );
  }

  assert.ok(
    controller.includes(
      "arduinoIp: ''"
    )
  );
  assert.ok(
    controller.includes(
      "localArduinoIp: ''"
    )
  );
  assert.ok(
    controller.includes(
      'migrateLegacyPlaceholder'
    )
  );
  assert.ok(
    controller.includes(
      'connectionReady'
    )
  );
  assert.ok(
    controller.includes(
      'testConnection'
    )
  );
  assert.ok(
    controller.includes(
      'await tauriApi.status()'
    )
  );
  assert.ok(
    controller.includes(
      'Az első használat előtt állítsd be a közvetlen Arduino kapcsolatot.'
    )
  );

  assert.ok(
    checklist.includes(
      'félrevezető `V5 rendszer` menü eltávolítása'
    )
  );
  assert.ok(
    checklist.includes(
      'történeti `V5SystemPage` és release/LXC panelek megőrizve'
    )
  );
  assert.ok(
    migratedLegacyContract.includes(
      'assert.doesNotMatch'
    )
  );
  assert.ok(
    migratedLegacyContract.includes(
      'a V5/LXC rendszeroldal nincs a normál navigációban'
    )
  );

  const manifest =
    JSON.parse(
      read(MANIFEST)
    );

  assert.strictEqual(
    manifest.package,
    'v5-direct-arduino-v14.1-connection-ui'
  );
  assert.strictEqual(
    manifest.expectedBaseCommit,
    '7a27aa6b91226bae7750ee29061024348f2151f6'
  );
  assert.strictEqual(
    manifest.directArduinoDefault,
    true
  );
  assert.strictEqual(
    manifest.serverMenuVisible,
    false
  );
  assert.strictEqual(
    manifest.nativeCredentialVaultIncluded,
    false
  );
  assert.strictEqual(
    manifest.legacyV5SystemUiDetached,
    true
  );
  assert.strictEqual(
    manifest.legacyV5SystemSourcesPreserved,
    true
  );
  assert.strictEqual(
    manifest.legacyDesktopUiContractMigrated,
    true
  );
  assert.strictEqual(
    manifest.files.length,
    manifest.fileCountExcludingManifest
  );

  for (
    const entry of
      manifest.files
  ) {
    const absolute =
      path.join(
        ROOT,
        entry.path
      );

    assert.ok(
      fs.existsSync(
        absolute
      ),
      `Hiányzó manifestfájl: ${entry.path}`
    );

    assert.strictEqual(
      fs.statSync(
        absolute
      ).size,
      entry.bytes,
      `${entry.path}: hibás fájlméret`
    );

    assert.strictEqual(
      sha256(
        entry.path
      ),
      entry.sha256,
      `${entry.path}: hibás SHA-256`
    );
  }

  console.log(
    'OK: V14.1 közvetlen Arduino kapcsolat az alapértelmezett UI'
  );
  console.log(
    'OK: V5/LXC session és Bearer panel nincs a normál navigációban'
  );
  console.log(
    'OK: helyi IP/port és távoli DDNS/port külön szerkeszthető'
  );
  console.log(
    'OK: teljes védett Arduino státuszteszt'
  );
  console.log(
    'OK: Beta címsegéd és régi placeholder migráció'
  );
  console.log(
    'OK: régi desktop V5 UI-szerződés direct-first módra migrálva'
  );
  console.log(
    'OK: történeti V5SystemPage forrás megőrizve, normál navigációból leválasztva'
  );
  console.log(
    'OK: V14.1 manifest és SHA-256'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
}
