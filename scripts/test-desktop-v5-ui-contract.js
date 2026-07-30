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

const page =
  read(
    'desktop-tauri/src/pages/V5SystemPage.tsx'
  );

assert.match(
  app,
  /page ===\s*'system'/
);

assert.match(
  sidebar,
  /V5 rendszer/
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
    'V5MigrationPanel'
  ]
) {
  assert.match(
    page,
    new RegExp(marker)
  );
}

console.log(
  'OK: V5 rendszeroldal bekötve az alkalmazásba'
);
console.log(
  'OK: kapcsolat, release, preflight, maintenance, snapshot és migráció panelek'
);
