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

const app =
  read(
    'desktop-tauri/src/App.tsx'
  );

const sidebar =
  read(
    'desktop-tauri/src/components/Sidebar.tsx'
  );

const main =
  read(
    'desktop-tauri/src/main.tsx'
  );

const types =
  read(
    'desktop-tauri/src/types/index.ts'
  );

const settings =
  read(
    'desktop-tauri/src/pages/SettingsPage.tsx'
  );

const archivedPage =
  read(
    'desktop-tauri/src/pages/V5SystemPage.tsx'
  );

const architecture =
  read(
    'docs/v5/V5_DIRECT_ARDUINO_ARCHITECTURE.md'
  );

assert.doesNotMatch(
  app,
  /V5SystemPage/
);

assert.doesNotMatch(
  app,
  /page ===\s*'system'/
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
  types,
  /\|\s*'system'/
);

assert.match(
  sidebar,
  /Arduino kapcsolat/
);

assert.match(
  settings,
  /KÖZVETLEN ARDUINO KAPCSOLAT/
);

assert.match(
  settings,
  /X-Device-Key/
);

assert.match(
  main,
  /DesktopApiProvider/
);

for (
  const marker
  of [
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
  'OK: közvetlen Arduino kapcsolat bekötve a normál alkalmazásba'
);

console.log(
  'OK: a V5/LXC rendszeroldal nincs a normál navigációban'
);

console.log(
  'OK: a történeti szerver-, release- és LXC panelek forrása megőrizve'
);

console.log(
  'OK: DesktopApiProvider megmaradt az átmeneti API v2 fallbackekhez'
);
