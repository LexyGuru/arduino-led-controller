#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino', 'utf8');

assert.match(source, /const bool legacyMutation\s*=/);
for (const endpoint of [
  '/api/all-on',
  '/api/all-off',
  '/api/schedules/upload',
  '/api/schedules/chunk',
  '/api/schedules/clear',
]) {
  assert.ok(source.includes(`base == "${endpoint}"`), `Missing legacy gate: ${endpoint}`);
}
assert.match(source, /base\.startsWith\("\/api\/led\/"\)/);
assert.match(source, /sendErrorJson\(c, 410, "LEGACY_MUTATION_REMOVED"/);
assert.match(source, /return 410;/);
assert.doesNotMatch(source, /void updateLedFromLegacyQuery/);
assert.doesNotMatch(source, /Legacy LED kezi beallitas alkalmazva/);
assert.doesNotMatch(source, /if \(base == "\/api\/all-on" \|\| base == "\/api\/all-off"\) \{/);
assert.doesNotMatch(source, /if \(base == "\/api\/schedules\/upload"\) \{/);
assert.doesNotMatch(source, /if \(base == "\/api\/schedules\/chunk"\) \{/);
assert.doesNotMatch(source, /if \(base == "\/api\/schedules\/clear"\) \{/);

console.log('OK: legacy mutation endpoints are centrally rejected with 410');
console.log('OK: invalid helper scope c/requestId compile regression removed');
