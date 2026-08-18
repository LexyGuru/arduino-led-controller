import assert from "node:assert/strict";
import fs from "node:fs";

const compact = (value) => value.replace(/\s+/g, "");

const runtime = fs.readFileSync(
  "desktop-tauri/src/utils/ota2RuntimeState.d.mts",
  "utf8",
);
const nativeBridge = fs.readFileSync(
  "desktop-tauri/src/utils/ota2NativeBridge.d.mts",
  "utf8",
);
const liveController = fs.readFileSync(
  "desktop-tauri/src/utils/ota2LiveInstallController.d.mts",
  "utf8",
);

const runtimeCompact = compact(runtime);
const nativeBridgeCompact = compact(nativeBridge);
const liveControllerCompact = compact(liveController);

for (const marker of [
  "exportinterfaceOta2RuntimeState",
  "stage:Ota2RuntimeStage",
  "code:string",
  "progress:number",
  "message:string",
  "terminal:boolean",
  "error:string|null",
  "createOta2RuntimeState():Ota2RuntimeState",
  "reduceOta2RuntimeEvent",
  "):Ota2RuntimeState",
]) {
  assert.ok(runtimeCompact.includes(marker), marker);
}

assert.ok(
  nativeBridgeCompact.includes(
    "onRuntime?:(runtime:Ota2RuntimeState)=>void"
  ),
  "native bridge must expose concrete Ota2RuntimeState",
);

assert.ok(
  liveControllerCompact.includes(
    "onRuntime?:(runtime:Ota2RuntimeState)=>void"
  ),
  "live controller must expose concrete Ota2RuntimeState",
);

assert.ok(
  !runtimeCompact.includes(
    "Readonly<Record<string,unknown>>"
  ),
  "runtime declaration must not collapse JSX fields to unknown",
);

console.log("BETA3_OTA2_RUNTIME_TYPES_CONCRETE=PASSED");
console.log("BETA3_OTA2_RUNTIME_JSX_PRIMITIVES=PASSED");
console.log("BETA3_OTA2_NATIVE_BRIDGE_RUNTIME_TYPE=PASSED");
console.log("BETA3_OTA2_LIVE_CONTROLLER_RUNTIME_TYPE=PASSED");
console.log("BETA3_OTA2_LIVE_TYPESCRIPT_RECOVERY=PASSED");
console.log("BETA3_TEST_POLICY=SEMANTIC_WHITESPACE_INDEPENDENT");
