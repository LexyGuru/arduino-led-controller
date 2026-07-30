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
  EventStore
} = require(
  '../server/events/event-store'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'event-store-'
      )
    );

  try {
    const store =
      new EventStore({
        filePath:
          path.join(
            tempRoot,
            'events.jsonl'
          ),
        archiveDir:
          path.join(
            tempRoot,
            'archive'
          ),
        maximumBytes:
          65536,
        maximumArchives:
          2
      });

    await store.append({
      id: '1',
      topic:
        'led.updated',
      timestamp:
        new Date()
          .toISOString(),
      payload: {
        id: 1
      },
      meta: {}
    });

    await store.append({
      id: '2',
      topic:
        'auth.login',
      timestamp:
        new Date()
          .toISOString(),
      payload: {
        username:
          'admin'
      },
      meta: {}
    });

    await store.flush();

    const all =
      await store.recent({
        limit: 10
      });

    const auth =
      await store.recent({
        limit: 10,
        topic:
          'auth.login'
      });

    assert.strictEqual(
      all.length,
      2
    );

    assert.strictEqual(
      auth.length,
      1
    );

    assert.strictEqual(
      auth[0].id,
      '2'
    );

    const stats =
      await store.stats();

    assert.strictEqual(
      stats.appendedCount,
      2
    );

    assert.strictEqual(
      stats.currentBytes > 0,
      true
    );

    console.log(
      'OK: tartós JSONL eseménytár'
    );
    console.log(
      'OK: téma szerinti tartós eseménylekérdezés'
    );
    console.log(
      'OK: eseménytár állapot és flush'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
