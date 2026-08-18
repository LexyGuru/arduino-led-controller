import assert from "node:assert/strict";
import { buildUpdateCenterPanelModel } from "../desktop-tauri/src/utils/updateCenterPanelModel.mjs";

const newer = buildUpdateCenterPanelModel({
  application: {installedVersion:"5.5.1-beta.2", availableVersion:"5.5.1-beta.3"},
  firmware: {
    installedVersion:"5.0.0-beta.9",
    availableFirmware:{firmwareVersion:"5.0.0-beta.10"},
    arduinoOnline:true, otaConfigured:true, backupStoreConfigured:true,
  },
});
assert.equal(newer.application.relation,"newer");
assert.equal(newer.firmware.relation,"newer");
assert.equal(newer.firmware.action,"update");
assert.equal(newer.firmware.canInstall,true);

const same = buildUpdateCenterPanelModel({
  firmware:{
    installedVersion:"5.0.0-beta.9",
    availableFirmware:{firmwareVersion:"5.0.0-beta.9"},
    arduinoOnline:true, otaConfigured:true, backupStoreConfigured:true,
  },
});
assert.equal(same.firmware.action,"current");
assert.equal(same.firmware.canInstall,false);

const older = buildUpdateCenterPanelModel({
  firmware:{
    installedVersion:"5.0.0-beta.10",
    availableFirmware:{firmwareVersion:"5.0.0-beta.9"},
    arduinoOnline:true, otaConfigured:true, backupStoreConfigured:true,
  },
});
assert.equal(older.firmware.relation,"older");
assert.equal(older.firmware.action,"restore");
assert.equal(older.firmware.canInstall,false);

const blocked = buildUpdateCenterPanelModel({
  firmware:{
    installedVersion:"5.0.0-beta.9",
    availableFirmware:{firmwareVersion:"5.0.0-beta.10"},
    arduinoOnline:true, otaConfigured:false, backupStoreConfigured:true,
  },
});
assert.equal(blocked.firmware.canInstall,false);

console.log("BETA3_UPDATE_CENTER_PANEL_MODEL=PASSED");
console.log("BETA3_UI_RELATION_SOURCE=FUNCTIONAL_CORE");
console.log("BETA3_UI_MAIN_UPDATE_DOWNGRADE=BLOCKED");
console.log("BETA3_UI_READINESS_GATE=PASSED");
