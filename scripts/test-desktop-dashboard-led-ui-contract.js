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

const dashboard =
  read(
    'desktop-tauri/src/pages/DashboardPage.tsx'
  );

const leds =
  read(
    'desktop-tauri/src/pages/LedsPage.tsx'
  );

const dashboardHook =
  read(
    'desktop-tauri/src/hooks/useV5Dashboard.ts'
  );

const ledHook =
  read(
    'desktop-tauri/src/hooks/useV5Leds.ts'
  );

for (
  const marker
  of [
    'useV5Dashboard',
    'V5DataSourceBadge',
    'V5ConnectionWarning',
    'dashboard.eyebrow'
  ]
) {
  assert.match(
    dashboard,
    new RegExp(marker)
  );
}

for (
  const marker
  of [
    'useV5Leds',
    'V5LedBulkActions',
    'V5DataSourceBadge',
    'leds.apiErrorDetail'
  ]
) {
  assert.match(
    leds,
    new RegExp(marker)
  );
}

assert.match(
  dashboardHook,
  /eventStream[\s\S]*subscribe/
);

assert.match(
  ledHook,
  /eventStream[\s\S]*subscribe/
);

assert.match(
  ledHook,
  /directFallback/
);

const updateBlock =
  ledHook.match(
    /const update =[\s\S]*?const runPreset =/
  )?.[0] ||
  '';

assert.match(
  updateBlock,
  /await api\.led\.update/
);

const apiCatchBlock =
  updateBlock.match(
    /await api\.led\.update[\s\S]*?catch \([\s\S]*?\} finally/
  )?.[0] ||
  '';

assert.doesNotMatch(
  apiCatchBlock,
  /directUpdate\s*\(/
);

console.log(
  'OK: Dashboard API v2 és legacy fallback UI'
);
console.log(
  'OK: LED API v2, realtime és bulk műveletek'
);
console.log(
  'OK: sikertelen API parancs után nincs automatikus dupla küldés'
);
