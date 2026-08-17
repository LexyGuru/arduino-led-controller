"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const CURRENT_APP_VERSION=require('../package.json').version;
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
const readme=fs.readFileSync("README.md","utf8");
const state=fs.readFileSync("docs/v5/BETA8_CURRENT_STATE.md","utf8");

assert.equal(pkg.version,CURRENT_APP_VERSION);
assert.match(CURRENT_APP_VERSION,/^\d+\.\d+\.\d+$/);
assert.ok(
  readme.includes(`| Stabil alkalmazás | \`${CURRENT_APP_VERSION}\` |`),
  `README Stable app identity is not current: ${CURRENT_APP_VERSION}`
);

assert.ok(fw.includes('#define FIRMWARE_VERSION "5.0.0-beta.7"'));
assert.ok(fw.includes('#define DIRECT_API_VERSION "1.0.0"'));
assert.ok(readme.includes('| Firmware | `5.0.0-beta.7` |'));

assert.ok(
  state.includes('`5.0.0-beta.10`') &&
  state.includes('`5.0.0-beta.7`') &&
  state.includes('`1.0.0`')
);

console.log(`OK: Stable app ${CURRENT_APP_VERSION}, historical firmware 5.0.0-beta.7, Direct API 1.0.0`);
