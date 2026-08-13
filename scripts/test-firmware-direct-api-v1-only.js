"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const fw = fs.readFileSync(
  "firmware/ArduinoLedController/ArduinoLedController.ino",
  "utf8",
);

assert.doesNotMatch(fw, /int routeLegacy\s*\(/);
assert.doesNotMatch(fw, /LEGACY_MUTATION_REMOVED/);
assert.doesNotMatch(fw, /DIRECT_API v1 JSON vegpontjait/);
assert.doesNotMatch(fw, /Ismeretlen legacy Arduino API vegpont/);
assert.doesNotMatch(fw, /Teljes legacy status URL/);
assert.doesNotMatch(fw, /\[cmd\] Legacy:/);

for (const endpoint of [
  "/api/status",
  "/api/led/status",
  "/api/console/logs",
  "/api/console/stats",
  "/api/console/clear",
  "/api/ota/status",
  "/api/ota/prepare",
  "/api/ota/restart",
  "/api/schedules/export",
  "/api/all-on",
  "/api/all-off",
  "/api/schedules/upload",
  "/api/schedules/chunk",
  "/api/schedules/clear",
]) {
  assert.ok(!fw.includes(`"${endpoint}"`), `Legacy firmware endpoint maradt: ${endpoint}`);
  assert.ok(!fw.includes(`Serial.println("${endpoint}")`), `Legacy serial URL maradt: ${endpoint}`);
}

assert.match(fw, /DIRECT_API_V1_REQUIRED/);
assert.match(fw, /if \(!pathStartsWith\(base, "\/api\/v1\/"\)\)/);
assert.match(fw, /return routeV1\(c, method, base, query, body, requestId\);/);
assert.match(fw, /Teljes Direct API v1 status URL/);
assert.match(fw, /\[cmd\] Direct v1:/);

for (const endpoint of [
  "/api/v1/status",
  "/api/v1/logs",
  "/api/v1/logs/clear",
  "/api/v1/ota/status",
  "/api/v1/ota/prepare",
  "/api/v1/schedules",
  "/api/v1/schedules/status",
  "/api/v1/leds",
]) {
  assert.ok(fw.includes(endpoint), `Hiányzó Direct API v1 végpont: ${endpoint}`);
}

const pollingStart = fw.indexOf("bool pollingPath(const char* path)");
const pollingEnd = fw.indexOf("void updateHttpTraceTimeout", pollingStart);
const polling = fw.slice(pollingStart, pollingEnd);
assert.doesNotMatch(polling, /"\/api\/(?!v1\/)/);

console.log("OK: routeLegacy és a teljes firmware legacy router törölve");
console.log("OK: soros legacy URL-ek törölve");
console.log("OK: pollingPath kizárólag Direct API v1 útvonalakat tartalmaz");
console.log("OK: Direct API v1 status/log/OTA/schedule/LED végpontok megmaradtak");
