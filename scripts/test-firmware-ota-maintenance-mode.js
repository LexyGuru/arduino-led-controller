"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
function body(a,b){const s=fw.indexOf(a),e=fw.indexOf(b,s);assert.ok(s>=0&&e>s,`Hiányzó blokk: ${a}`);return fw.slice(s,e)}
for(const m of ["#define OTA_MAINTENANCE_MODE_V1 1","bool startNtpUdpService()","void stopNtpUdpService()","IPAddress otaIp = WiFi.localIP();","if (otaReady) ArduinoOTA.poll();","if (otaTransferActive) return;","if (otaPrepareModeActive()) return;"])assert.ok(fw.includes(m),`Hiányzó marker: ${m}`);
const enter=body("void enterOtaMaintenanceMode()","void leaveOtaMaintenanceMode()"); assert.doesNotMatch(enter,/stopNtpUdpService\s*\(/);
const prepare=body("bool prepareOtaService()","float effectScale"); assert.doesNotMatch(prepare,/stopNtpUdpService\s*\(/); assert.match(prepare,/NTP UDP valtozatlan/);
const before=body("void otaBeforeApply()","void otaTransferError"); assert.doesNotMatch(before,/Serial\.|logEvent|showMatrix|EEPROM|WiFi|ntpUdp/); assert.match(before,/showOtaIndicator\(0,255,60\)/);
const loop=fw.slice(fw.indexOf("void loop() {")); assert.ok(loop.indexOf("ArduinoOTA.poll()")<loop.indexOf("handleSerialCommands()")); assert.ok(loop.indexOf("if (otaTransferActive) return;")<loop.indexOf("handleHttp()"));
console.log("OK: OTA listener után az NTP UDP socket változatlan marad");
console.log("OK: aktív OTA alatt HTTP, schedule, LED és háttérfeladat nem fut");
console.log("OK: flash finalizálás callback minimális és hálózatmentes");
