'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(
    path.join(ROOT, relativePath),
    'utf8'
  );
}

const app = read(
  'desktop-tauri/src/App.tsx'
);

const sidebar = read(
  'desktop-tauri/src/components/Sidebar.tsx'
);

const main = read(
  'desktop-tauri/src/main.tsx'
);

const types = read(
  'desktop-tauri/src/types/index.ts'
);

const settings = read(
  'desktop-tauri/src/pages/SettingsPage.tsx'
);

const archivedPage = read(
  'desktop-tauri/src/pages/V5SystemPage.tsx'
);

const architecture = read(
  'docs/v5/V5_DIRECT_ARDUINO_ARCHITECTURE.md'
);

const pageIdMatch = types.match(
  /export type PageId\s*=\s*([\s\S]*?);/
);

assert.ok(
  pageIdMatch,
  'A PageId típus nem található.'
);

const pageIdDefinition = pageIdMatch[1];

/*
 * A régi V5 rendszeroldal nem lehet a normál alkalmazás
 * navigációjának része.
 */
assert.doesNotMatch(
  app,
  /V5SystemPage/
);

assert.doesNotMatch(
  app,
  /page ===\s*['"]system['"]/
);

assert.doesNotMatch(
  sidebar,
  /V5 rendszer/
);

assert.doesNotMatch(
  sidebar,
  /ServerCog/
);

assert.doesNotMatch(
  pageIdDefinition,
  /['"]system['"]/
);

/*
 * A "system" érték OTA uploader módként érvényes,
 * ezért csak a PageId típusban tiltjuk.
 */
assert.match(
  types,
  /otaUploadMode:\s*'auto'\s*\|\s*'system'\s*\|\s*'bundled'\s*\|\s*'custom'/
);

/*
 * Az új Direct Mode Settings szerződés.
 */
assert.match(
  settings,
  /DIRECT MODE PROFIL/
);

assert.match(
  settings,
  /Kapcsolat és hitelesítés/
);

assert.match(
  settings,
  /Helyi IP vagy DDNS/
);

assert.match(
  settings,
  /Távoli IP vagy DDNS/
);

assert.match(
  settings,
  /Privát API path/
);

assert.match(
  settings,
  /X-Device-Key/
);

assert.match(
  settings,
  /FIRMWARE ÉS OTA/
);

assert.match(
  settings,
  /Helyi arduinoOTA konzol/
);

assert.match(
  settings,
  /OTA-port/
);

assert.match(
  settings,
  /arduinoOTA útvonal/
);

assert.match(
  settings,
  /FRISSÍTÉSEK/
);

assert.match(
  settings,
  /Stable és Beta csatorna/
);

assert.match(
  settings,
  /Frissítési csatorna/
);

assert.match(
  settings,
  /Profil mentése/
);

assert.match(
  settings,
  /Kapcsolat tesztelése/
);

/*
 * Az új Direct Mode navigáció továbbra is látható.
 */
assert.match(
  sidebar,
  /Arduino kapcsolat/
);

/*
 * Az átmeneti Desktop API provider még szükséges
 * a megmaradt API v2 fallbackekhez.
 */
assert.match(
  main,
  /DesktopApiProvider/
);

/*
 * A régi release/LXC panelek forrása még megmarad,
 * de nincs bekötve a normál navigációba.
 */
for (
  const marker of [
    'V5ConnectionPanel',
    'V5ReleasePanel',
    'V5PreflightPanel',
    'V5MaintenancePanel',
    'V5SnapshotPanel',
    'V5MigrationPanel',
    'V5ReleaseGatePanel',
    'V5ReleaseFinalizationPanel',
    'V5LxcOrchestrationPanel'
  ]
) {
  assert.match(
    archivedPage,
    new RegExp(marker)
  );
}

assert.match(
  architecture,
  /opcionális szerver/i
);

console.log(
  'OK: Direct Mode kapcsolat bekötve a normál alkalmazásba'
);

console.log(
  'OK: a V5/LXC rendszeroldal nincs a normál navigációban'
);

console.log(
  'OK: system OTA uploader mód engedélyezett, de system oldal nincs'
);

console.log(
  'OK: IP/DDNS, API path, OTA és update-channel mezők jelen vannak'
);

console.log(
  'OK: a történeti szerver-, release- és LXC panelek forrása megőrizve'
);

console.log(
  'OK: DesktopApiProvider megmaradt az átmeneti API v2 fallbackekhez'
);
