"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fw = fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino", "utf8");

function bodyBetween(startMarker, endMarker) {
  const start = fw.indexOf(startMarker);
  assert.ok(start >= 0, `Hiányzó marker: ${startMarker}`);
  const end = fw.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Hiányzó lezáró marker: ${endMarker}`);
  return fw.slice(start, end);
}

assert.doesNotMatch(fw, /\bbool\s+v1\b/);
assert.doesNotMatch(fw, /if\s*\(\s*v1\s*\)/);
assert.ok(fw.includes("bool buildStatusJson(size_t& bodyLength, uint32_t requestId)"));
assert.ok(fw.includes("void sendStatusJson(WiFiClient& c, uint32_t requestId)"));
assert.ok(fw.includes("void sendLogsJson(WiFiClient& c, uint32_t afterId, uint32_t requestId)"));
assert.ok(fw.includes("void sendOtaStatusJson(WiFiClient& c, uint32_t requestId)"));

const status = bodyBetween(
  "bool buildStatusJson(size_t& bodyLength, uint32_t requestId)",
  "void sendStatusJson(WiFiClient& c, uint32_t requestId)",
);
for (const key of [
  "connected", "timesynced", "deviceId", "bootId", "firmwareVersion",
  "directApiVersion", "scheduleRevision", "scheduleChecksum", "strips",
]) {
  assert.ok(status.includes(`\\\"${key}\\\"`), `Hiányzó status JSON kulcs: ${key}`);
}

const routes = bodyBetween("int routeV1(", "int routeRequest(");
for (const endpoint of [
  "/api/v1/status", "/api/v1/logs", "/api/v1/logs/clear",
  "/api/v1/ota/status", "/api/v1/ota/prepare", "/api/v1/time/config",
  "/api/v1/schedules", "/api/v1/leds",
]) assert.ok(routes.includes(endpoint), `Hiányzó Direct API v1 route: ${endpoint}`);

for (const removed of [
  "sendDiagnosticsJson", "sendConfigStatusJson", "sendConsoleStatsJson",
  "/api/v1/diagnostics", "/api/v1/config/status", "/api/v1/logs/stats",
]) assert.ok(!routes.includes(removed) && !fw.includes(`void ${removed}(`), `Eltávolított diagnosztikai elem visszatért: ${removed}`);

const logs = bodyBetween("void sendLogsJson(", "void sendOtaStatusJson(");
for (const key of ["lastId", "logs", "message", "timestamp", "type"]) {
  assert.ok(logs.includes(`\\\"${key}\\\"`), `Hiányzó logs JSON kulcs: ${key}`);
}
assert.ok(routes.includes("afterId"), "Hiányzó afterId logs query kezelés");

console.log("OK: Direct API v1 fő JSON builderek és route-ok megmaradtak");
console.log("OK: status/logs escape-elt JSON kulcsok ellenőrizve");
console.log("OK: duplikált diagnosztikai route-ok és builderek eltávolítva");
