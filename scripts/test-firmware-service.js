'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  FirmwareReleaseClient,
  parseReleaseArtifact
} = require(
  '../server/firmware/firmware-release-client'
);

const {
  FirmwareService
} = require(
  '../server/firmware/firmware-service'
);

const {
  OtaRunner
} = require(
  '../server/firmware/ota-runner'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'firmware-service-'
      )
    );

  const toolPath =
    path.join(
      tempRoot,
      'arduinoOTA'
    );

  fs.writeFileSync(
    toolPath,
    'test'
  );

  fs.chmodSync(
    toolPath,
    0o755
  );

  const firmware =
    Buffer.alloc(
      2048,
      7
    );

  const checksum =
    crypto
      .createHash('sha256')
      .update(firmware)
      .digest('hex');

  const releasePayload = {
    id: 42,
    tag_name:
      'firmware-latest',
    target_commitish:
      'abcdef1234567890',
    published_at:
      '2026-07-28T12:00:00.000Z',
    body:
      'Firmware verzió: 5.0.0\nForrás commit: abcdef1234567890',
    assets: [
      {
        name:
          'Arduino_LED_Controller_Firmware_5.0.0_UNO_R4_WiFi.bin',
        browser_download_url:
          'https://github.com/example/firmware.bin',
        digest:
          `sha256:${checksum}`
      },
      {
        name:
          'Arduino_LED_Controller_Firmware_5.0.0_UNO_R4_WiFi.bin.sha256',
        browser_download_url:
          'https://github.com/example/firmware.sha256'
      }
    ]
  };

  const parsed =
    parseReleaseArtifact(
      releasePayload
    );

  assert.strictEqual(
    parsed.firmwareVersion,
    '5.0.0'
  );

  const transport = {
    async get(url) {
      if (
        url.includes(
          '/releases/tags/'
        )
      ) {
        return {
          data:
            releasePayload
        };
      }

      if (
        url.endsWith(
          'firmware.bin'
        )
      ) {
        return {
          data:
            firmware
        };
      }

      if (
        url.endsWith(
          'firmware.sha256'
        )
      ) {
        return {
          data:
            `${checksum}  firmware.bin\n`
        };
      }

      throw new Error(
        `Váratlan URL: ${url}`
      );
    }
  };

  const releaseClient =
    new FirmwareReleaseClient({
      repository:
        'LexyGuru/arduino-led-controller',
      releaseTag:
        'firmware-latest',
      transport
    });

  const artifact =
    await releaseClient
      .getLatestArtifact();

  const targetPath =
    path.join(
      tempRoot,
      'firmware',
      'latest.bin'
    );

  const downloaded =
    await releaseClient
      .downloadVerified(
        artifact,
        targetPath
      );

  assert.strictEqual(
    downloaded.sha256,
    checksum
  );

  assert.strictEqual(
    fs.readFileSync(
      targetPath
    ).equals(firmware),
    true
  );

  let programCall = null;

  const otaArgumentRunner =
    new OtaRunner({
      toolPath,
      address:
        '192.0.2.25',
      port:
        65280,
      username:
        'arduino',
      password:
        'ota-password',
      programRunner:
        async (
          command,
          args,
          options
        ) => {
          programCall = {
            command,
            args,
            options
          };

          return {
            code: 0,
            output: 'ok'
          };
        }
    });

  await otaArgumentRunner.upload(
    targetPath
  );

  assert.strictEqual(
    programCall.command,
    toolPath
  );

  assert.deepStrictEqual(
    programCall.args,
    [
      '-address',
      '192.0.2.25',
      '-port',
      '65280',
      '-username',
      'arduino',
      '-password',
      'ota-password',
      '-sketch',
      targetPath,
      '-upload',
      '/sketch',
      '-b'
    ]
  );

  let installedVersion =
    '4.9.0';

  let uploadedPath = null;

  const service =
    new FirmwareService({
      arduinoClient: {
        async getStatus() {
          return {
            status: {
              firmwareVersion:
                installedVersion,
              networkConfigStored:
                true
            }
          };
        }
      },
      releaseClient: {
        async getLatestArtifact() {
          return artifact;
        },
        async downloadVerified(
          received,
          binaryPath
        ) {
          assert.strictEqual(
            received,
            artifact
          );

          fs.mkdirSync(
            path.dirname(
              binaryPath
            ),
            {
              recursive: true
            }
          );

          fs.writeFileSync(
            binaryPath,
            firmware
          );

          return {
            path:
              binaryPath,
            size:
              firmware.length,
            sha256:
              checksum
          };
        }
      },
      otaRunner: {
        async upload(
          binaryPath
        ) {
          uploadedPath =
            binaryPath;

          installedVersion =
            '5.0.0';
        }
      },
      firmwareDir:
        path.join(
          tempRoot,
          'runtime-firmware'
        ),
      otaToolPath:
        toolPath,
      otaPassword:
        'ota-password',
      repository:
        'LexyGuru/arduino-led-controller',
      releaseTag:
        'firmware-latest',
      waitImplementation:
        async () => {},
      restartTimeoutMs:
        5000
    });

  const status =
    await service.getStatus();

  assert.strictEqual(
    status.arduinoOnline,
    true
  );

  assert.strictEqual(
    status.otaConfigured,
    true
  );

  const result =
    await service.runUpdate();

  assert.strictEqual(
    result.state,
    'success'
  );

  assert.strictEqual(
    typeof uploadedPath,
    'string'
  );

  assert.strictEqual(
    service.state
      .installedVersion,
    '5.0.0'
  );

  console.log(
    'OK: GitHub firmware release feldolgozás'
  );
  console.log(
    'OK: SHA-256 és GitHub digest ellenőrzés'
  );
  console.log(
    'OK: shell nélküli OTA argumentumtömb'
  );
  console.log(
    'OK: OTA feltöltés és újraindulás-ellenőrzés'
  );

  fs.rmSync(
    tempRoot,
    {
      recursive: true,
      force: true
    }
  );
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
