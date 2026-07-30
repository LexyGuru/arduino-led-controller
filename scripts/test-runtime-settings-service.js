'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const os =
  require('os');
const path =
  require('path');

const {
  RuntimeSettingsService,
  normalizeArduinoTarget
} = require(
  '../server/core/runtime-settings-service'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'runtime-settings-'
      )
    );

  try {
    const calls = [];

    const service =
      new RuntimeSettingsService({
        settingsFile:
          path.join(
            tempRoot,
            'server-settings.json'
          ),
        arduinoClient: {
          config: {
            ip:
              '10.0.0.117',
            port:
              80
          },
          setTarget(ip, port) {
            calls.push([
              'arduino',
              ip,
              port
            ]);
            this.config = {
              ip,
              port
            };
          }
        },
        otaRunner: {
          setTarget(ip) {
            calls.push([
              'ota',
              ip
            ]);
          }
        },
        eventBus: {
          publish(
            topic,
            payload
          ) {
            calls.push([
              'event',
              topic,
              payload
                .arduinoIP
            ]);
          }
        }
      });

    assert.deepStrictEqual(
      normalizeArduinoTarget({
        arduinoIP:
          'arduino.local',
        arduinoPort:
          8080
      }),
      {
        arduinoIP:
          'arduino.local',
        arduinoPort:
          8080
      }
    );

    const result =
      await service
        .updateArduinoTarget({
          arduinoIP:
            '192.168.1.20',
          arduinoPort:
            81
        });

    assert.strictEqual(
      result.success,
      true
    );

    assert.deepStrictEqual(
      service.getArduinoTarget(),
      {
        arduinoIP:
          '192.168.1.20',
        arduinoPort:
          81
      }
    );

    const saved =
      JSON.parse(
        fs.readFileSync(
          path.join(
            tempRoot,
            'server-settings.json'
          ),
          'utf8'
        )
      );

    assert.strictEqual(
      saved.arduinoIP,
      '192.168.1.20'
    );

    assert.strictEqual(
      calls.some(
        (call) =>
          call[0] === 'ota'
      ),
      true
    );

    console.log(
      'OK: Arduino célgép-validáció'
    );
    console.log(
      'OK: atomikus runtime settings mentés'
    );
    console.log(
      'OK: Arduino és OTA cél frissítése'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive: true,
        force: true
      }
    );
  }
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
