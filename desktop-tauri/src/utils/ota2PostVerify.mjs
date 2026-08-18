export const OTA2_POSTVERIFY_CODES = Object.freeze({
  READY: "X5500",
  BOOT_NOT_CHANGED: "X5501",
  VERSION_MISMATCH: "X5502",
  SCHEDULE_REVISION_MISMATCH: "X5503",
  SCHEDULE_CHECKSUM_MISMATCH: "X5504",
  STATUS_INCOMPLETE: "X5505",
});
const text=(v)=>{const x=String(v??"").trim();return x||null};
const num=(v)=>{const x=Number(v);return Number.isFinite(x)?x:null};
export function evaluateOta2PostVerify({before=null,after=null,expectedVersion=null}={}) {
  const bootBefore=text(after?.bootIdBefore ?? before?.bootIdBefore ?? before?.bootIdAfter);
  const bootAfter=text(after?.bootIdAfter);
  const installed=text(after?.installedVersion);
  const expected=text(expectedVersion);
  const revisionBefore=num(after?.scheduleRevisionBefore ?? before?.scheduleRevisionBefore ?? before?.scheduleRevisionAfter);
  const revisionAfter=num(after?.scheduleRevisionAfter);
  const checksumBefore=text(after?.scheduleChecksumBefore ?? before?.scheduleChecksumBefore ?? before?.scheduleChecksumAfter);
  const checksumAfter=text(after?.scheduleChecksumAfter);
  const checks=Object.freeze({
    statusComplete:Boolean(after),
    bootChanged:Boolean(bootBefore&&bootAfter)&&bootBefore!==bootAfter,
    versionMatches:Boolean(expected&&installed)&&expected===installed,
    scheduleRevisionPreserved:revisionBefore!=null&&revisionAfter!=null&&revisionBefore===revisionAfter,
    scheduleChecksumPreserved:Boolean(checksumBefore&&checksumAfter)&&checksumBefore===checksumAfter,
  });
  let code=OTA2_POSTVERIFY_CODES.READY;
  if(!checks.statusComplete) code=OTA2_POSTVERIFY_CODES.STATUS_INCOMPLETE;
  else if(!checks.bootChanged) code=OTA2_POSTVERIFY_CODES.BOOT_NOT_CHANGED;
  else if(!checks.versionMatches) code=OTA2_POSTVERIFY_CODES.VERSION_MISMATCH;
  else if(!checks.scheduleRevisionPreserved) code=OTA2_POSTVERIFY_CODES.SCHEDULE_REVISION_MISMATCH;
  else if(!checks.scheduleChecksumPreserved) code=OTA2_POSTVERIFY_CODES.SCHEDULE_CHECKSUM_MISMATCH;
  return Object.freeze({
    ok:code===OTA2_POSTVERIFY_CODES.READY,
    code,checks,
    evidence:Object.freeze({
      bootBefore,bootAfter,installedVersion:installed,expectedVersion:expected,
      revisionBefore,revisionAfter,checksumBefore,checksumAfter,
      cacheSha256:text(after?.cacheSha256),
    }),
  });
}
