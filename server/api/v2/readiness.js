'use strict';

const fs = require('fs');

const {
  isConfiguredSecret
} = require('../../core/config');

function normalizeCheck(check) {
  return check.ok
    ? {
        name: check.name,
        ok: true
      }
    : check;
}

function apiConfigurationChecks(
  runtime
) {
  const tokenCheck = normalizeCheck({
    name: 'apiV2Token',
    ok: isConfiguredSecret(
      runtime.config.apiV2.token,
      32
    ),
    code:
      'API_V2_TOKEN_INVALID'
  });

  return [
    tokenCheck,
    ...runtime.arduinoClient
      .configurationChecks()
  ];
}

function runtimeDirectories(runtime) {
  return {
    dataDir:
      runtime.paths.dataDir,
    configDir:
      runtime.paths.configDir,
    schedulesDir:
      runtime.paths.schedulesDir,
    firmwareDir:
      runtime.paths.firmwareDir
  };
}

async function checkRuntimeDirectory(
  name,
  directoryPath
) {
  try {
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
    ...apiConfigurationChecks(
      runtime
    ),
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
