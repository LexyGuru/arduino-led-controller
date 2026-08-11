const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const otaDoc = read('docs/firmware/OTA_UPDATE.md');
const firmwareReadme = read('firmware/README.md');

function has(re, text, message) {
  assert.ok(re.test(text), message);
}

has(/-username arduino/, rust,
  'UNO R4 OTA username must be "arduino".');
has(/-address "\$ADDRESS" -port "\$PORT" -username arduino/, rust,
  'UNO R4 OTA command must pass address, configured port, and username arduino.');
has(/-sketch "\$BINARY" -upload \/sketch -b/, rust,
  'UNO R4 OTA command must upload /sketch with the Renesas -b apply/boot flag.');
has(/TIMEOUT_ARGS/, rust,
  'UNO R4 external arduinoOTA path must keep explicit timeout handling.');
has(/-t/, rust,
  'UNO R4 external arduinoOTA path must support the arduinoOTA -t timeout flag.');

has(/-port 65280/, otaDoc, 'OTA documentation must keep port 65280.');
has(/-username arduino/, otaDoc, 'OTA documentation must keep username arduino.');
has(/-upload \/sketch/, otaDoc, 'OTA documentation must keep /sketch endpoint.');
has(/-b/, otaDoc, 'OTA documentation must keep Renesas -b flag.');
has(/-t 120/, otaDoc, 'OTA documentation must keep 120 second flash timeout.');
has(/platform\.local\.txt/, otaDoc,
  'OTA documentation must explain the UNO R4 platform.local.txt prerequisite.');
has(/közvetlen|direct|parancssor|command line/i, otaDoc,
  'OTA documentation must distinguish IDE integration from direct uploader invocation.');
has(/65280/, firmwareReadme, 'Firmware README must document the OTA port.');

console.log('UNO_R4_RENESAS_OTA_USERNAME=PASSED');
console.log('UNO_R4_RENESAS_OTA_PORT=PASSED');
console.log('UNO_R4_RENESAS_OTA_SKETCH_ENDPOINT=PASSED');
console.log('UNO_R4_RENESAS_OTA_BOOT_FLAG_B=PASSED');
console.log('UNO_R4_RENESAS_OTA_TIMEOUT=PASSED');
console.log('UNO_R4_PLATFORM_LOCAL_DOC_CONTRACT=PASSED');
console.log('UNO_R4_RENESAS_OTA_CONTRACT=PASSED');
