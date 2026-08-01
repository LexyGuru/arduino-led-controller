'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(
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

const schedules = read(
  'desktop-tauri/src/pages/SchedulesPage.tsx'
);
const firmware = read(
  'desktop-tauri/src/pages/FirmwarePage.tsx'
);
const logs = read(
  'desktop-tauri/src/pages/LogsPage.tsx'
);
const scheduleHook = read(
  'desktop-tauri/src/hooks/useV5Schedules.ts'
);
const firmwareHook = read(
  'desktop-tauri/src/hooks/useV5Firmware.ts'
);
const firmwareBackups = read(
  'desktop-tauri/src/components/v5/V5FirmwareBackups.tsx'
);

for (
  const marker
  of [
    'ARDUINO DIRECT API V1',
    'Arduino lista betöltése',
    'Mentés Arduino-ra',
    'expectedRevision',
    'state.canWrite'
  ]
) {
  assert.match(
    schedules,
    new RegExp(marker)
  );
}

assert.doesNotMatch(
  schedules,
  /A V5 szerverlista az elsődleges/
);

assert.doesNotMatch(
  schedules,
  /Runner kézi futtatása/
);

for (
  const marker
  of [
    'V5FirmwareBackups',
    'Megszakítás',
    'rollback'
  ]
) {
  assert.match(
    firmware,
    new RegExp(
      marker,
      'i'
    )
  );
}

assert.match(
  firmwareBackups,
  /lastKnownGood/
);

for (
  const marker
  of [
    'Közös konzolcache',
    'BIZTONSÁGI AUDIT',
    'EVENT BUS',
    'V5LogToolbar'
  ]
) {
  assert.match(
    logs,
    new RegExp(marker)
  );
}

assert.match(
  scheduleHook,
  /SCHEDULE_CONFLICT/
);

assert.match(
  scheduleHook,
  /await directSync\(\)/
);

assert.match(
  scheduleHook,
  /await directSave\(/
);

assert.doesNotMatch(
  scheduleHook,
  /api\.schedules/
);

const updateBlock =
  firmwareHook.match(
    /const startUpdate =[\s\S]*?const cancel =/
  )?.[0] ||
  '';

assert.doesNotMatch(
  updateBlock,
  /catch[\s\S]*directUpdate/
);

console.log(
  'OK: Direct Arduino schedule revision-konfliktus és írásvédelmi UI'
);
console.log(
  'OK: firmware backup, rollback és cancel UI'
);
console.log(
  'OK: konzol, audit, esemény és helyi hálózati napló UI'
);
console.log(
  'OK: API-hiba után nincs automatikus dupla firmware-indítás'
);
