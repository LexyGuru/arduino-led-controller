import assert from 'node:assert/strict';
import fs from 'node:fs';
const fw=fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
for(const marker of ['createOta2LiveInstallController','createOta2RecoveryCoordinator','Ota2OperationPanel','runAudited','ota2Installing']) assert.ok(fw.includes(marker),marker);
assert.equal(pkg.version,'5.5.1-beta.4');
console.log('BETA3_REDESIGN_OTA2_LOGIC_PRESERVED=PASSED');
console.log('BETA3_REDESIGN_VERSION_UNCHANGED=PASSED');
