"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
function body(a,b){const s=fw.indexOf(a),e=fw.indexOf(b,s);assert.ok(s>=0&&e>s,`Hiányzó blokk: ${a}`);return fw.slice(s,e)}
for(const marker of [
  "ArduinoOTA.onStart(otaTransferStarted);",
  "ArduinoOTA.beforeApply(otaBeforeApply);",
  "ArduinoOTA.onError(otaTransferError);",
  "InternalStorage",
  "bool schedulesStored = false, otaReady = false, otaTransferActive = false, otaExclusiveMode = false;",
  "if (otaReady) ArduinoOTA.poll();",
  "if (otaExclusiveMode || otaTransferActive) return;"
]) assert.ok(fw.includes(marker),`Hiányzó marker: ${marker}`);
const exclusive=body("void enterOtaExclusiveMode()","void leaveOtaExclusiveMode()");
assert.match(exclusive,/otaExclusiveMode\s*=\s*true/);
assert.match(exclusive,/stopNtpUdpService\(\)/);
assert.match(exclusive,/stopNeoPixelsForOta\(\)/);
assert.match(exclusive,/showMatrix\(MATRIX_OTA\)/);
assert.doesNotMatch(exclusive,/WiFi\.disconnect|ArduinoOTA\.end|EEPROM|server\.begin|clearSchedule|saveSchedule|writeSchedule/);
const started=body("void otaTransferStarted()","void otaBeforeApply()");
assert.match(started,/otaExclusiveMode\s*=\s*true/);
assert.match(started,/showMatrix\(MATRIX_OTA\)/);
assert.doesNotMatch(started,/showOtaIndicator|logEvent|stopNtpUdpService|EEPROM|handleHttp|runArduinoSchedules|clearSchedule|saveSchedule/);
const before=body("void otaBeforeApply()","void otaTransferError");
assert.match(before,/showMatrix\(MATRIX_OK\)/);
assert.doesNotMatch(before,/showOtaIndicator|logEvent|EEPROM|WiFi|ntpUdp|server|strip\[|schedule/i);
const prepare=body("bool prepareOtaService()","float effectScale");
assert.match(prepare,/enterOtaExclusiveMode\(\)/);
assert.doesNotMatch(prepare,/showOtaIndicator|logEvent|clearSchedule|saveSchedule|EEPROM/);
const log=body("void logEvent(const char* type, const char* message)","void consoleLine");
assert.match(log,/if \(otaExclusiveMode\) return;/);
const loop=fw.slice(fw.indexOf("void loop() {"));
const poll=loop.indexOf("ArduinoOTA.poll()");
const visual=loop.indexOf("updateOtaVisualState()");
const gate=loop.indexOf("if (otaExclusiveMode || otaTransferActive) return;");
const http=loop.indexOf("handleHttp()");
assert.ok(poll>=0&&visual>poll&&gate>visual&&http>gate,"OTA timeout/exclusive gate sorrend hibás");
console.log("OK: OTA Exclusive Mode csak WiFi + ArduinoOTA + LED Matrix útvonalat hagy aktívan");
console.log("OK: prepare timeout az exclusive return előtt feldolgozódik");
console.log("OK: OTA útvonal nem törli és nem írja újra a schedule storage-ot");
