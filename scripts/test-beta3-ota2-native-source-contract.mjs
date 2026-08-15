import assert from "node:assert/strict";
import fs from "node:fs";
const compact=(s)=>s.replace(/\s+/g,"");
const api=compact(fs.readFileSync("desktop-tauri/src/services/tauriApi.ts","utf8"));
const types=compact(fs.readFileSync("desktop-tauri/src/types/index.ts","utf8"));
assert.ok(api.includes("firmwareInstallRelease:(tag:string):Promise<FirmwareStatus>"));
assert.ok(api.includes("firmwareStatus:():Promise<FirmwareStatus>"));
assert.ok(api.includes("listenOtaProgress:async(listener:(entry:OtaProgressEvent)=>void)"));
for(const field of [
 "cacheSha256?:string","bootIdBefore?:string","bootIdAfter?:string",
 "scheduleRevisionBefore?:number","scheduleRevisionAfter?:number",
 "scheduleChecksumBefore?:string","scheduleChecksumAfter?:string"
]) assert.ok(types.includes(field),field);
console.log("BETA3_OTA2_NATIVE_API_CONTRACT=PASSED");
console.log("BETA3_OTA2_POSTVERIFY_STATUS_FIELDS=PASSED");
