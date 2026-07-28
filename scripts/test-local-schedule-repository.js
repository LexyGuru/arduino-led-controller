'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  LocalScheduleRepository
} = require(
  '../server/schedule/local-schedule-repository'
);

function sample(overrides = {}) {
  return {
    day: 1,
    time: '19:30',
    leds: [
      {
        id: 1,
        enabled: true,
        brightness: 180,
        effect: 2,
        speed: 50,
        color: '#FF2800'
      }
    ],
    ...overrides
  };
}

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'local-schedules-'
      )
    );

  try {
    const repository =
      new LocalScheduleRepository({
        filePath:
          path.join(
            tempRoot,
            'weekly-led-schedules.json'
          ),
        backupDir:
          path.join(
            tempRoot,
            'backups'
          )
      });

    const created =
      await repository.create({
        ...sample(),
        days: [1, 3, 5]
      });

    assert.strictEqual(
      created.length,
      3
    );

    const listed =
      await repository.list();

    assert.deepStrictEqual(
      listed.map(
        (item) => item.day
      ),
      [1, 3, 5]
    );

    const exported =
      await repository
        .exportDocument();

    assert.strictEqual(
      exported.version,
      1
    );

    assert.strictEqual(
      exported.schedules.length,
      3
    );

    const replaced =
      await repository.replaceAll({
        schedules: [
          sample({
            day: 7,
            time: '22:00'
          })
        ]
      });

    assert.strictEqual(
      replaced.count,
      1
    );

    assert.strictEqual(
      typeof replaced.backupFile,
      'string'
    );

    const backupPath =
      path.join(
        tempRoot,
        'backups',
        replaced.backupFile
      );

    assert.strictEqual(
      fs.existsSync(backupPath),
      true
    );

    const afterReplace =
      await repository.list();

    assert.strictEqual(
      afterReplace[0].day,
      7
    );

    await repository.remove(
      afterReplace[0].id
    );

    assert.deepStrictEqual(
      await repository.list(),
      []
    );

    console.log(
      'OK: atomikus helyi schedule repository'
    );
    console.log(
      'OK: többnapos schedule létrehozás'
    );
    console.log(
      'OK: import/export és automatikus backup'
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
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
