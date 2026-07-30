'use strict';

const assert = require('assert');

async function main() {
  const {
    DesktopScheduleApi
  } = await import(
    '../desktop-tauri/src/api/runtime/domain/schedule-api.mjs'
  );

  const {
    DesktopFirmwareApi
  } = await import(
    '../desktop-tauri/src/api/runtime/domain/firmware-api.mjs'
  );

  const {
    DesktopLogApi
  } = await import(
    '../desktop-tauri/src/api/runtime/domain/log-api.mjs'
  );

  const calls = [];

  const client = new Proxy(
    {},
    {
      get(
        target,
        property
      ) {
        return async (
          options = {}
        ) => {
          calls.push({
            property,
            options
          });
          return {
            operation:
              property
          };
        };
      }
    }
  );

  const runtime = {
    async read(
      key,
      operation,
      options
    ) {
      calls.push({
        read: key,
        options
      });
      return operation();
    },

    async write(operation) {
      calls.push({
        write: true
      });
      return operation();
    }
  };

  const schedules = new DesktopScheduleApi({
    client,
    runtime
  });

  const firmware = new DesktopFirmwareApi({
    client,
    runtime
  });

  const logs = new DesktopLogApi({
    client,
    runtime
  });

  await schedules.listLocal();
  await schedules.replaceAll([]);
  await schedules.syncArduino();
  await schedules.runnerStatus();
  await schedules.forceTick();

  await firmware.status();
  await firmware.backups();
  await firmware.update();
  await firmware.cancel();
  await firmware.rollback('fw_id');
  await firmware.deleteBackup(
    'fw_id'
  );

  await logs.consoleLogs();
  await logs.consoleStats();
  await logs.clearConsole();
  await logs.auditRecent();
  await logs.auditStatus();
  await logs.eventsRecent();
  await logs.eventsStatus();

  const operations = calls
    .filter(
      (item) =>
        item.property
    )
    .map(
      (item) =>
        item.property
    );

  for (
    const required
    of [
      'getLocalSchedules',
      'postLocalSchedulesImport',
      'postLocalSchedulesActionsSyncArduino',
      'getLocalSchedulesRunner',
      'postLocalSchedulesRunnerActionsTick',
      'getFirmwareStatus',
      'getFirmwareBackups',
      'postFirmwareActionsUpdate',
      'postFirmwareActionsCancel',
      'postFirmwareActionsRollback',
      'deleteFirmwareBackupsById',
      'getArduinoConsoleLogs',
      'getArduinoConsoleStats',
      'postArduinoConsoleActionsClear',
      'getAuditRecent',
      'getAuditStatus',
      'getEventsRecent',
      'getEventsStatus'
    ]
  ) {
    assert.strictEqual(
      operations.includes(
        required
      ),
      true,
      `Hiányzó művelet: ${required}`
    );
  }

  console.log(
    'OK: teljes schedule API v2 desktop domain'
  );
  console.log(
    'OK: firmware update, cancel, backup és rollback domain'
  );
  console.log(
    'OK: konzol, audit és esemény desktop domain'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
