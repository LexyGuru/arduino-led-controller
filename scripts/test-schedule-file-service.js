'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ScheduleFileService
} = require('../server/files/schedule-file-service');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-files-'));
  const uploads = [];
  try {
    const service = new ScheduleFileService({
      schedulesDir: root,
      arduinoClient: {
        async post(endpoint, data) {
          uploads.push({ endpoint, data });
          return { data: { success: true } };
        }
      },
      uploadEndpoint: 'api/schedule/upload',
      maximumBytes: 4096
    });

    const stored = await service.store(
      's0l1.js',
      JSON.stringify({ active: true })
    );
    assert.strictEqual(stored.filename, 'S0L1.JS');
    assert.strictEqual(stored.arduinoUploaded, true);
    assert.strictEqual(uploads[0].endpoint, 'api/schedule/upload');

    const files = await service.list();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].name, 'S0L1.JS');
    assert.strictEqual('path' in files[0], false);

    const read = await service.read('S0L1.JS');
    assert.strictEqual(read.document.active, true);

    await assert.rejects(
      () => service.store('bad.json', '{}'),
      (error) => error.code === 'INVALID_SCHEDULE_FILENAME'
    );
    await assert.rejects(
      () => service.store('S1L1.JS', '{bad'),
      (error) => error.code === 'INVALID_SCHEDULE_JSON'
    );

    console.log('OK: biztonságos schedule fájlnév és JSON-validáció');
    console.log('OK: atomikus helyi schedule fájlmentés');
    console.log('OK: opcionális konfigurált Arduino feltöltés');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
