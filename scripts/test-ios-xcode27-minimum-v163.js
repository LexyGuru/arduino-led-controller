const fs=require("fs");
const assert=require("assert");
const cfg=JSON.parse(fs.readFileSync("desktop-tauri/src-tauri/tauri.conf.json","utf8"));
assert.strictEqual(cfg.bundle.iOS.minimumSystemVersion,"15.0");
console.log("IOS_MINIMUM_SYSTEM_VERSION_15=PASSED");
