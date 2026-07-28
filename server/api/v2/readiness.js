'use strict';

const fs = require('fs');

const {
  resolveApiTokenStore
} = require('./auth');

function normalizeCheck(check) {
  return check.ok
    ? {
        name: check.name,
        ok: true
      }
    : check;
}

function apiConfigurationChecks(runtime) {
  return [
    ...resolveApiTokenStore(runtime)
      .configurationChecks(),
    ...runtime.arduinoClient
      .configurationChecks()
  ];
}

function runtimeDirectories(runtime) {
  const directories = {
    dataDir:
      runtime.paths.dataDir,
    configDir:
      runtime.paths.configDir,
    schedulesDir:
      runtime.paths.schedulesDir,
    localScheduleBackupDir:
      runtime.paths.localScheduleBackupDir,
    firmwareDir:
      runtime.paths.firmwareDir
  };

  return Object.fromEntries(
    Object.entries(directories)
      .filter(
        ([, directoryPath]) =>
          typeof directoryPath ===
            'string' &&
          directoryPath.trim()
      )
  );
}

async function checkRuntimeDirectory(
  name,
  directoryPath
) {
  try {
    await fs.promises.mkdir(
      directoryPath,
      {
        recursive: true
      }
    );

    const stats =
      await fs.promises.stat(
        directoryPath
      );

    if (!stats.isDirectory()) {
      return {
        name,
        ok: false,
        code: 'NOT_DIRECTORY'
      };
    }

    await fs.promises.access(
      directoryPath,
      fs.constants.R_OK |
      fs.constants.W_OK
    );

    return {
      name,
      ok: true
    };
  } catch (error) {
    return {
      name,
      ok: false,
      code:
        error.code ||
        'DIRECTORY_ERROR'
    };
  }
}

async function collectApiV2ReadinessChecks(
  runtime
) {
  const directoryChecks =
    await Promise.all(
      Object.entries(
        runtimeDirectories(runtime)
      ).map(
        ([name, directoryPath]) =>
          checkRuntimeDirectory(
            name,
            directoryPath
          )
      )
    );

  return [
    ...apiConfigurationChecks(runtime),
    ...directoryChecks
  ];
}

module.exports = {
  apiConfigurationChecks,
  checkRuntimeDirectory,
  collectApiV2ReadinessChecks,
  normalizeCheck,
  runtimeDirectories
};
