"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fw = fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino", "utf8");
assert.doesNotMatch(fw, /\bbool\s+v1\b/);
assert.doesNotMatch(fw, /if\s*\(\s*v1\s*\)/);
assert.doesNotMatch(fw, /send(?:Status|Logs|ConsoleStats|OtaStatus)Json\([^;]*,\s*true\s*\)/);
for (const marker of [
  "bool buildStatusJson(size_t& bodyLength, uint32_t requestId)",
  "void sendStatusJson(WiFiClient& c, uint32_t requestId)",
  "void sendLogsJson(WiFiClient& c, uint32_t afterId, uint32_t requestId)",
  "void sendConsoleStatsJson(WiFiClient& c, uint32_t requestId)",
  "void sendOtaStatusJson(WiFiClient& c, uint32_t requestId)",
  "{\\\"success\\\":true,\\\"requestId\\\":%lu,",
  "\\\"directApiVersion\\\":\\\"%s\\\"",
  "/api/v1/status", "/api/v1/logs", "/api/v1/logs/stats", "/api/v1/ota/status"
]) assert.ok(fw.includes(marker), `Hiányzó marker: ${marker}`);
console.log("OK: function-scoped JSON cleanup");
console.log("OK: dinamikus true callsite cleanup");
console.log("OK: v1 mezők és végpontok megmaradtak");
