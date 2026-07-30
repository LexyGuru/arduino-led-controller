'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  FirmwareBackupStore
} = require('../server/firmware/firmware-backup-store');

const {
  FirmwareService
} = require('../server/firmware/firmware-service');

async function main() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'firmware-backup-')
  );

  const toolPath = path.join(root, 'arduinoOTA');
  fs.writeFileSync(toolPath, 'test');
  fs.chmodSync(toolPath, 0o755);

  try {
    const binary = Buffer.alloc(4096, 9);
    const source = path.join(root, 'source.bin');
    fs.writeFileSync(source, binary);

    const sha256 = crypto
      .createHash('sha256')
      .update(binary)
      .digest('hex');

    const backupStore = new FirmwareBackupStore({
      backupDir: path.join(root, 'backups'),
      maximumBackups: 4
    });

    const first = await backupStore.storeCandidate({
      sourcePath: source,
      expectedSha256: sha256,
      artifact: {
        firmwareVersion: '4.9.0',
        tag: 'firmware-4.9.0'
      }
    });

    await backupStore.markLastKnownGood(
      first.id,
      '4.9.0'
    );

    const list = await backupStore.list();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].lastKnownGood, true);

    await assert.rejects(
      () => backupStore.remove(first.id),
      (error) => error.code === 'FIRMWARE_LAST_KNOWN_GOOD_PROTECTED'
    );

    let installedVersion = '5.0.0';
    let uploadedPath = null;

    const service = new FirmwareService({
      arduinoClient: {
        async getStatus() {
          return {
            status: {
              firmwareVersion: installedVersion,
              networkConfigStored: true
            }
          };
        }
      },
      releaseClient: {
        async getLatestArtifact() {
          return { firmwareVersion: '5.0.1' };
        }
      },
      otaRunner: {
        async upload(binaryPath) {
          uploadedPath = binaryPath;
          installedVersion = '4.9.0';
        },
        cancel() {
          return { cancelled: true };
        }
      },
      backupStore,
      firmwareDir: path.join(root, 'runtime'),
      otaToolPath: toolPath,
      otaPassword: 'ota-password',
      repository: 'LexyGuru/arduino-led-controller',
      releaseTag: 'firmware-latest',
      waitImplementation: async () => {},
      restartTimeoutMs: 5000
    });

    const result = await service.runRollback(first.id);

    assert.strictEqual(result.state, 'success');
    assert.strictEqual(typeof uploadedPath, 'string');
    assert.strictEqual(result.installedVersion, '4.9.0');

    console.log('OK: firmware backup index és SHA-256');
    console.log('OK: last-known-good backup védelem');
    console.log('OK: OTA firmware rollback és újraindulás-ellenőrzés');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
