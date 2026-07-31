'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

const firmware = read(
  'firmware/ArduinoLedController/ArduinoLedController.ino'
);

assert.match(
  firmware,
  /FIRMWARE_FEATURE "f14\.1\.3-wifis3-response-transport"/
);

assert.match(
  firmware,
  /HTTP_WRITE_CHUNK_SIZE = 128/
);

assert.match(
  firmware,
  /HTTP_WRITE_INTER_CHUNK_DELAY_MS = 2UL/
);

assert.match(
  firmware,
  /httpHeaderBuffer\[HTTP_RESPONSE_HEADER_SIZE\]/
);

assert.match(
  firmware,
  /bool writeClientBuffer\(/
);

assert.match(
  firmware,
  /c\.flush\(\)/
);

assert.match(
  firmware,
  /static_assert\(HTTP_WRITE_CHUNK_SIZE <= 128/
);

assert.doesNotMatch(
  firmware,
  /HTTP_WRITE_CHUNK_SIZE = 512/
);

for (const size of [1024, 896, 768, 640, 512, 384, 320]) {
  assert.doesNotMatch(
    firmware,
    new RegExp(`char response\\\\[${size}\\\\]`)
  );
}

assert.match(
  firmware,
  /httpResponseChunkBytes/
);

assert.match(
  firmware,
  /writeChunkBytes/
);

const writer = firmware.match(
  /bool sendJsonBuffer[\s\S]*?void sendJsonLiteral/
);

assert.ok(writer, 'Hiányzó sendJsonBuffer blokk');

assert.match(
  writer[0],
  /writeClientBuffer/
);

assert.doesNotMatch(
  writer[0],
  /char header\[/
);

console.log('OK: WiFiS3 response write legfeljebb 128 bájtos');
console.log('OK: header és body ugyanazzal a darabolt writerrel megy');
console.log('OK: explicit flush és inter-chunk delay');
console.log('OK: nagy lokális JSON-választömbök eltávolítva');
console.log('OK: response chunk mérete diagnosztikában látható');
