import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  "desktop-tauri/src/pages/FirmwarePage.tsx",
  "utf8",
);
const operationPanel = fs.readFileSync(
  "desktop-tauri/src/components/v55/Ota2OperationPanel.tsx",
  "utf8",
);
const n = page.replace(/\s+/g, "");
const p = operationPanel.replace(/\s+/g, "");

assert.ok(n.includes("createOta2LiveInstallController"));
assert.ok(n.includes("createOta2RuntimeState"));
assert.ok(n.includes("const[ota2Runtime,setOta2Runtime]=useState"));
assert.ok(n.includes("const[ota2Result,setOta2Result]=useState"));
assert.ok(
  n.includes(
    "constinstallCatalogItem=async(item:FirmwareArtifact,version:string,mode:'update'|'reinstall'|'restore')=>"
  )
);
assert.ok(n.includes("firmwareInstallRelease:tauriApi.firmwareInstallRelease"));
assert.ok(n.includes("firmwareStatus:tauriApi.firmwareStatus"));
assert.ok(n.includes("subscribeProgress:tauriApi.listenOtaProgress"));
assert.ok(n.includes("onRuntime:setOta2Runtime"));
assert.ok(n.includes("awaitinstallCatalogItem(item,version,"));
assert.ok(!n.includes("awaittauriApi.firmwareInstallRelease(version)"));
assert.ok(n.includes("<Ota2OperationPanel"));
assert.ok(n.includes("runtime={ota2Runtime}"));
assert.ok(n.includes("result={ota2Result}"));
assert.ok(p.includes("buildOta2OperationUx({runtime,result,mode,installing})"));
assert.ok(p.includes("t(ux.stageKey)"));
assert.ok(p.includes("ux.progress"));
assert.ok(p.includes("result?.code??runtime.code"));

console.log("BETA3_OTA2_LIVE_UI_INSTALL_CALLBACK=PASSED");
console.log("BETA3_OTA2_LIVE_UI_RUNTIME_STATE=PASSED");
console.log("BETA3_OTA2_LIVE_UI_RESULT_CODE=PASSED");
console.log("BETA3_OTA2_DIRECT_CATALOG_INSTALL_BYPASS=REMOVED");
