"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const fw = fs.readFileSync(
  "firmware/ArduinoLedController/ArduinoLedController.ino",
  "utf8",
);

const sizeMatch = fw.match(
  /constexpr\s+size_t\s+HTTP_BODY_BUFFER_SIZE\s*=\s*(\d+)\s*;/,
);
assert.ok(sizeMatch, "HTTP_BODY_BUFFER_SIZE constant missing");
const size = Number(sizeMatch[1]);

assert.ok(
  size >= 3072,
  `HTTP status response buffer headroom regressed: ${size} < 3072`,
);
assert.ok(
  size <= 3072,
  `Unexpected RAM growth: HTTP_BODY_BUFFER_SIZE=${size}, expected 3072`,
);

assert.match(
  fw,
  /static_assert\(HTTP_BODY_BUFFER_SIZE\s*<=\s*3072,\s*"F14\.1 HTTP buffer is too large"\);/,
);
assert.match(
  fw,
  /if\s*\(pathEquals\(base,\s*"\/api\/v1\/status"\).*sendStatusJson\(c,\s*requestId\)/,
);
assert.match(
  fw,
  /if\s*\(pathEquals\(base,\s*"\/api\/v1\/leds"\).*sendStatusJson\(c,\s*requestId\)/,
);
assert.match(
  fw,
  /"RESPONSE_BUFFER_EXHAUSTED"/,
);

console.log(`HTTP_BODY_BUFFER_SIZE=${size}`);
console.log("STATUS_RESPONSE_MIN_HEADROOM_CONTRACT=3072");
console.log("STATUS_AND_LEDS_SHARED_STATUS_JSON=PRESERVED");
console.log("FIRMWARE_STATUS_BUFFER_HEADROOM_V413=PASSED");
