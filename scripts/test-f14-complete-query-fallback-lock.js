#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8',
);

assert.match(
  source,
  /#ifdef API_ALLOW_QUERY_KEY_FALLBACK\s+#undef API_ALLOW_QUERY_KEY_FALLBACK\s+#endif\s+#define API_ALLOW_QUERY_KEY_FALLBACK 0/,
);

assert.doesNotMatch(
  source,
  /#ifndef API_ALLOW_QUERY_KEY_FALLBACK\s+#define API_ALLOW_QUERY_KEY_FALLBACK 0\s+#endif/,
);

assert.match(
  source,
  /Query fallback:\s+INAKTIV \(FORRASKODBAN ZAROLT\)/,
);

const diagnosticFieldOccurrences = (
  source.match(/queryKeyFallbackEnabled\\":%s/g) || []
).length;
assert.ok(
  diagnosticFieldOccurrences >= 3,
  `Legalább 3 queryKeyFallbackEnabled diagnosztikai mező várt, talált: ${diagnosticFieldOccurrences}`,
);

const compileStateOccurrences = (
  source.match(/API_ALLOW_QUERY_KEY_FALLBACK \? "true" : "false"/g) || []
).length;
assert.ok(
  compileStateOccurrences >= 3,
  `Legalább 3 fordítási állapothoz kötött JSON érték várt, talált: ${compileStateOccurrences}`,
);

assert.match(source, /#if API_ALLOW_QUERY_KEY_FALLBACK/);
assert.match(
  source,
  /Serial\.println\(API_ALLOW_QUERY_KEY_FALLBACK \? "DEPRECATED\/ON" : "OFF"\)/,
);

console.log('OK: query fallback forráskódban megkerülhetetlenül kikapcsolva');
console.log('OK: privát secrets.h nem tudja visszakapcsolni');
console.log('OK: Serial és JSON diagnosztika az aktív fordítási állapotot jelzi');
console.log(`OK: queryKeyFallbackEnabled mezők: ${diagnosticFieldOccurrences}`);
