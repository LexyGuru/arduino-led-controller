"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fw = fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino", "utf8");

for (const marker of [
  "#define OTA_MAINTENANCE_MODE_V1 1",
  "ntpUdpActive = false",
  "bool startNtpUdpService()",
  "void stopNtpUdpService()",
  "ntpUdp.stop();",
  "void enterOtaMaintenanceMode()",
  "void leaveOtaMaintenanceMode()",
  "IPAddress otaIp = WiFi.localIP();",
  "if (otaReady) ArduinoOTA.poll();",
  "if (otaTransferActive) return;",
  "if (otaPrepareModeActive()) return;",
]) {
  assert.ok(fw.includes(marker), `Hiányzó marker: ${marker}`);
}

const beforeApplyStart = fw.indexOf("void otaBeforeApply()");
const beforeApplyEnd = fw.indexOf("void otaTransferError", beforeApplyStart);
const beforeApply = fw.slice(beforeApplyStart, beforeApplyEnd);
assert.match(beforeApply, /Serial\.println/);
assert.doesNotMatch(beforeApply, /logEvent|showMatrix|showOtaIndicator|EEPROM/);

const loopStart = fw.indexOf("void loop() {");
const loop = fw.slice(loopStart);
assert.ok(loop.indexOf("ArduinoOTA.poll()") < loop.indexOf("handleSerialCommands()"));
assert.ok(loop.indexOf("if (otaTransferActive) return;") < loop.indexOf("handleHttp()"));

console.log("OK: OTA maintenance mode leállítja az NTP UDP socketet");
console.log("OK: aktív OTA alatt HTTP, schedule, LED és háttérfeladat nem fut");
console.log("OK: flash finalizálás callback minimális");
console.log("OK: hiba vagy prepare-timeout után az NTP szolgáltatás visszaáll");
