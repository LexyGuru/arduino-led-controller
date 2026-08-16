#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const firmware=read('desktop-tauri/src/pages/FirmwarePage.tsx');
const update=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');
const ota2=read('desktop-tauri/src/components/v55/Ota2OperationPanel.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-firmware-update-center-redesign.css');
const pkg=JSON.parse(read('package.json'));

const semanticCall=(object,method)=>
  new RegExp(`${object}\\s*\\.\\s*${method}\\s*\\(`);

assert.match(
  firmware,
  /className="page v55-firmware-page beta4-firmware-redesign"/
);
assert.match(
  main,
  /import '\.\/v551-beta4-firmware-update-center-redesign\.css';/
);

for(const marker of [
  '.beta4-firmware-redesign .beta3-update-center',
  '.beta4-firmware-redesign .beta3-update-card',
  '.beta4-firmware-redesign .beta3-readiness-statuses',
  '.beta4-firmware-redesign .ota-progress-panel',
  '.beta4-firmware-redesign .ota-console',
  '.beta4-firmware-redesign .beta3-ota2-operation',
  '.beta4-firmware-redesign .beta3-ota2-blockers',
  '.beta4-firmware-redesign .beta3-ota2-history-row',
  '.beta4-firmware-redesign .v5-firmware-catalog-scroll',
  '@media (prefers-reduced-motion: reduce)'
]){
  assert.ok(css.includes(marker),`missing firmware redesign contract: ${marker}`);
}

// Firmware orchestration preserved.
assert.match(firmware,/useV5Firmware/);
assert.match(firmware,/runUpdateCenterCheckBoth/);
assert.match(firmware,/createOta2LiveInstallController/);
assert.match(firmware,/createOta2RuntimeState/);
assert.match(firmware,/createOta2RecoveryCoordinator/);
assert.match(firmware,/isOta2CancelSafe/);
assert.match(firmware,/OTA2_UX_CODES/);
assert.match(firmware,/runAudited/);

assert.match(firmware,semanticCall('controller','install'));
assert.match(firmware,semanticCall('recovery','prepare'));
assert.match(firmware,semanticCall('state','refresh'));
assert.match(firmware,semanticCall('state','cancel'));
assert.match(firmware,semanticCall('tauriApi','firmwareInstallExternal'));

// Update Center behavior preserved.
assert.match(update,/buildUpdateCenterPanelModel/);
assert.match(update,/getUpdateRelation/);
assert.match(update,/updateCenterModel\.firmware\.canInstall/);
assert.match(update,/readiness\.every/);
assert.match(update,/onInstallFirmware/);
assert.match(update,/downgradeBlocked/);

// OTA2 operation UX/history/cancellation preserved.
assert.match(ota2,/buildOta2OperationUx/);
assert.match(ota2,/runtime\.history\.slice\(-5\)/);
assert.match(ota2,/ux\.blockerKeys/);
assert.match(ota2,/ux\.canCancel/);
assert.match(ota2,/ux\.critical/);
assert.match(ota2,/ota2StageTranslationKey/);

assert.equal(
  pkg.scripts['test:beta4-firmware-update-center-redesign'],
  'node scripts/test-beta4-firmware-update-center-redesign.mjs'
);

console.log('BETA4_FIRMWARE_COMMAND_CENTER=PASSED');
console.log('BETA4_UPDATE_CENTER_GLASS_CARDS=PASSED');
console.log('BETA4_UPDATE_READINESS_VISUAL=PASSED');
console.log('BETA4_OTA_CONSOLE_VISUAL=PASSED');
console.log('BETA4_OTA2_TIMELINE_VISUAL=PASSED');
console.log('BETA4_OTA2_BLOCKER_HISTORY_VISUAL=PASSED');
console.log('BETA4_RESTORE_CATALOG_VISUAL=PASSED');
console.log('BETA4_UPDATE_CENTER_MODEL_PRESERVED=PASSED');
console.log('BETA4_OTA2_CONTROLLER_PRESERVED=PASSED');
console.log('BETA4_FIRMWARE_UPDATE_CENTER_REDESIGN=PASSED');
