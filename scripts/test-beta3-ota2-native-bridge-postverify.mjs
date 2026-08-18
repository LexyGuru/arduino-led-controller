import assert from "node:assert/strict";
import {createOta2RuntimeState,mapOtaProgressToStage,reduceOta2RuntimeEvent} from "../desktop-tauri/src/utils/ota2RuntimeState.mjs";
import {evaluateOta2PostVerify,OTA2_POSTVERIFY_CODES} from "../desktop-tauri/src/utils/ota2PostVerify.mjs";
import {createOta2NativeBridge,OTA2_NATIVE_BRIDGE_CODES} from "../desktop-tauri/src/utils/ota2NativeBridge.mjs";

const mappings=[
 [{stage:"Download firmware"},"DOWNLOAD"],
 [{message:"SHA-256 checksum verify"},"VERIFY"],
 [{message:"Schedule backup készül"},"BACKUP"],
 [{message:"OTA prepare connect"},"CONNECT"],
 [{message:"Natív Rust POST /sketch feltöltés"},"UPLOAD"],
 [{message:"Flashing firmware"},"FLASH"],
 [{message:"Arduino újraindulására várunk"},"REBOOT_WAIT"],
 [{message:"Firmware version verify"},"VERSION_VERIFY"],
 [{message:"Schedule checksum persistence"},"PERSISTENCE_VERIFY"],
 [{level:"success"},"SUCCESS"],
 [{level:"error"},"FAILURE"],
];
for(const [entry,expected] of mappings){
  assert.equal(mapOtaProgressToStage(entry),expected,JSON.stringify(entry));
}

let runtime=createOta2RuntimeState();
runtime=reduceOta2RuntimeEvent(runtime,{timestamp:1,message:"POST /sketch feltöltés",progress:67});
assert.equal(runtime.stage,"UPLOAD");
assert.equal(runtime.busy,true);
assert.equal(runtime.progress,67);
runtime=reduceOta2RuntimeEvent(runtime,{timestamp:2,level:"success",message:"OTA kész",progress:100});
assert.equal(runtime.stage,"SUCCESS");
assert.equal(runtime.terminal,true);

const before={bootIdAfter:"boot-old",scheduleRevisionAfter:42,scheduleChecksumAfter:"schedule-sha"};
const after={
 installedVersion:"5.0.0-beta.10",bootIdBefore:"boot-old",bootIdAfter:"boot-new",
 scheduleRevisionBefore:42,scheduleRevisionAfter:42,
 scheduleChecksumBefore:"schedule-sha",scheduleChecksumAfter:"schedule-sha",
 cacheSha256:"a".repeat(64)
};
const post=evaluateOta2PostVerify({before,after,expectedVersion:"5.0.0-beta.10"});
assert.equal(post.ok,true);
assert.equal(post.code,OTA2_POSTVERIFY_CODES.READY);

assert.equal(evaluateOta2PostVerify({before,after:{...after,bootIdAfter:"boot-old"},expectedVersion:"5.0.0-beta.10"}).code,OTA2_POSTVERIFY_CODES.BOOT_NOT_CHANGED);
assert.equal(evaluateOta2PostVerify({before,after:{...after,installedVersion:"5.0.0-beta.9"},expectedVersion:"5.0.0-beta.10"}).code,OTA2_POSTVERIFY_CODES.VERSION_MISMATCH);
assert.equal(evaluateOta2PostVerify({before,after:{...after,scheduleRevisionAfter:43},expectedVersion:"5.0.0-beta.10"}).code,OTA2_POSTVERIFY_CODES.SCHEDULE_REVISION_MISMATCH);
assert.equal(evaluateOta2PostVerify({before,after:{...after,scheduleChecksumAfter:"changed"},expectedVersion:"5.0.0-beta.10"}).code,OTA2_POSTVERIFY_CODES.SCHEDULE_CHECKSUM_MISMATCH);

let progressListener=null,unsubscribed=false;
const runtimeEvents=[];
const bridge=createOta2NativeBridge({
 firmwareStatus:async()=>before,
 firmwareInstallRelease:async(tag)=>{
  assert.equal(tag,"5.0.0-beta.10");
  progressListener?.({message:"Natív Rust POST /sketch feltöltés",progress:50});
  progressListener?.({message:"Arduino reboot",progress:90});
  return after;
 },
 subscribeProgress:async(listener)=>{
  progressListener=listener;
  return async()=>{unsubscribed=true;progressListener=null};
 }
});
const result=await bridge.install({tag:"5.0.0-beta.10",expectedVersion:"5.0.0-beta.10",onRuntime:(v)=>runtimeEvents.push(v.stage)});
assert.equal(result.ok,true);
assert.equal(result.code,OTA2_NATIVE_BRIDGE_CODES.READY);
assert.deepEqual(runtimeEvents,["UPLOAD","REBOOT_WAIT"]);
assert.equal(unsubscribed,true);

const postFail=await createOta2NativeBridge({
 firmwareStatus:async()=>before,
 firmwareInstallRelease:async()=>({...after,scheduleChecksumAfter:"changed"}),
}).install({tag:"5.0.0-beta.10",expectedVersion:"5.0.0-beta.10"});
assert.equal(postFail.ok,false);
assert.equal(postFail.code,OTA2_NATIVE_BRIDGE_CODES.POSTVERIFY_FAILED);

console.log("BETA3_OTA2_PROGRESS_STAGE_MAPPING=PASSED");
console.log("BETA3_OTA2_RUNTIME_STATE=PASSED");
console.log("BETA3_OTA2_BOOT_ID_VERIFY=PASSED");
console.log("BETA3_OTA2_VERSION_POSTVERIFY=PASSED");
console.log("BETA3_OTA2_SCHEDULE_REVISION_PERSISTENCE=PASSED");
console.log("BETA3_OTA2_SCHEDULE_CHECKSUM_PERSISTENCE=PASSED");
console.log("BETA3_OTA2_NATIVE_INSTALL_BRIDGE=PASSED");
console.log("BETA3_OTA2_PROGRESS_SUBSCRIPTION_CLEANUP=PASSED");
console.log("BETA3_OTA2_NATIVE_BRIDGE_POSTVERIFY_MEGA=PASSED");
