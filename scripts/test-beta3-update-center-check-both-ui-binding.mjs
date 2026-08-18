import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  "desktop-tauri/src/pages/FirmwarePage.tsx",
  "utf8",
);
const n = page.replace(/\s+/g, "");

assert.ok(
  n.includes(
    "runUpdateCenterCheckBoth({refreshStatus:()=>state.refresh({forceCheck:true}),refreshFirmwareCatalog:refreshCatalog})"
  )
);
assert.ok(n.includes("constcheckBoth=async()=>"));
assert.ok(
  !n.includes(
    "onClick={()=>voidstate.refresh({forceCheck:true})}"
  ),
  "heading check must not bypass the shared Check both handler",
);
assert.ok(
  n.includes("onClick={()=>voidcheckBoth()}"),
  "heading check button must use the shared handler",
);
assert.ok(
  /<UpdateCenterPanel[\s\S]*?onCheck=\{\s*\(\)\s*=>\s*void\s+checkBoth\(\)\s*\}/.test(page),
  "UpdateCenterPanel.onCheck must use the same shared handler",
);

console.log("BETA3_CHECK_BOTH_HEADING_BUTTON_BINDING=PASSED");
console.log("BETA3_CHECK_BOTH_PANEL_CALLBACK_BINDING=PASSED");
console.log("BETA3_CHECK_BOTH_SINGLE_RUNTIME_HANDLER=PASSED");
