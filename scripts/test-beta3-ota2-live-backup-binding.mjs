import assert from "node:assert/strict";
import fs from "node:fs";
const page=fs.readFileSync("desktop-tauri/src/pages/FirmwarePage.tsx","utf8");const n=page.replace(/\s+/g,"");
for(const marker of ["createOta2RecoveryCoordinator","loadSchedules:tauriApi.loadSchedulesFromArduino","createScheduleBackup:tauriApi.createScheduleBackup","createBackup:()=>recovery.prepare()"]){assert.ok(n.includes(marker),marker)}
const controller=fs.readFileSync("desktop-tauri/src/utils/ota2LiveInstallController.mjs","utf8");
assert.ok(controller.includes("createOta2SingleFlightGuard"));assert.ok(controller.includes("BACKUP_FAILED"));assert.ok(controller.indexOf("await createBackup()")<controller.indexOf("await bridge.install"));
console.log("BETA3_OTA2_LIVE_BACKUP_BINDING=PASSED");
console.log("BETA3_OTA2_BACKUP_BEFORE_NATIVE_INSTALL=PASSED");
console.log("BETA3_OTA2_LIVE_SINGLE_FLIGHT=PASSED");
