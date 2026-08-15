import assert from "node:assert/strict";
import { withBoundedReadRetry, createOta2SingleFlightGuard, OTA2_RESILIENCE_CODES } from "../desktop-tauri/src/utils/ota2Resilience.mjs";
import { createOta2RecoveryCoordinator } from "../desktop-tauri/src/utils/ota2Recovery.mjs";
import { scrubOta2Diagnostics, scrubOta2DiagnosticText } from "../desktop-tauri/src/utils/ota2Diagnostics.mjs";
import { evaluateBeta3PreRedesignReadiness } from "../desktop-tauri/src/utils/beta3PreRedesignReadiness.mjs";

let attempts=0;const sleeps=[];
const read=await withBoundedReadRetry(async()=>{attempts++;if(attempts<3){const e=new Error("temporary");e.status=503;throw e}return "ok"},{attempts:3,baseDelayMs:10,sleep:async(ms)=>sleeps.push(ms)});
assert.equal(read,"ok");assert.equal(attempts,3);assert.deepEqual(sleeps,[10,20]);
let nonRetry=0;await assert.rejects(()=>withBoundedReadRetry(async()=>{nonRetry++;const e=new Error("bad");e.status=400;throw e},{sleep:async()=>{}}));assert.equal(nonRetry,1);

const guard=createOta2SingleFlightGuard();let release;const first=guard.run(()=>new Promise(r=>release=r));const second=await guard.run(async()=>"duplicate");assert.equal(second.accepted,false);assert.equal(second.code,OTA2_RESILIENCE_CODES.OPERATION_BUSY);release("done");assert.equal((await first).value,"done");

let reads=0,writes=0;const recovery=createOta2RecoveryCoordinator({loadSchedules:async()=>{reads++;if(reads===1){const e=new Error("busy");e.status=503;throw e}return{schedules:[{id:"1"}],revision:7,checksum:"abc"}},createScheduleBackup:async(schedules,revision,checksum)=>{writes++;return{id:"schedule-1",count:schedules.length,revision,checksum}},retry:(op)=>withBoundedReadRetry(op,{attempts:3,baseDelayMs:0,sleep:async()=>{}})});
const backup=await recovery.prepare();assert.equal(backup.backupId,"schedule-1");assert.equal(reads,2);assert.equal(writes,1);

const scrubbed=scrubOta2Diagnostics({password:"secret",nested:{token:"abc",url:"https://x.test/a?k=SECRET&ok=1"},header:"Authorization: Bearer abc.def"});
assert.equal(scrubbed.password,"[REDACTED]");assert.equal(scrubbed.nested.token,"[REDACTED]");assert.ok(!scrubbed.nested.url.includes("SECRET"));assert.ok(!scrubbed.header.includes("abc.def"));
assert.equal(scrubOta2DiagnosticText("Bearer xyz"),"Bearer [REDACTED]");

const ready=evaluateBeta3PreRedesignReadiness({updateCenter:true,preflight:true,shaVerification:true,automaticScheduleBackup:true,cancelSafety:true,postFlashVerification:true,diagnosticsScrub:true,operationSingleFlight:true,audit:true});
assert.equal(ready.redesignReady,true);assert.ok(ready.deferred.includes("native application self-updater installation"));
console.log("BETA3_OTA2_BOUNDED_READ_RETRY=PASSED");
console.log("BETA3_OTA2_SINGLE_FLIGHT_GUARD=PASSED");
console.log("BETA3_OTA2_AUTOMATIC_SCHEDULE_BACKUP=PASSED");
console.log("BETA3_OTA2_WRITE_NOT_RETRIED=PASSED");
console.log("BETA3_OTA2_DIAGNOSTIC_SECRET_SCRUB=PASSED");
console.log("BETA3_PRE_REDESIGN_READINESS_MODEL=PASSED");
console.log("BETA3_GAP_HARDENING_MEGA=PASSED");
