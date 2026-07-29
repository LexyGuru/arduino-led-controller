#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
ENV_FILE="${ENV_FILE:-/etc/arduino-led-controller.env}"

cd "${APP_DIR}"

if [[ -r "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"

node - <<'NODE'
const {
  createRuntimePaths
} = require('./server/core/runtime-paths');

const {
  loadRuntimeConfig
} = require('./server/core/config');

const {
  ApiTokenStore
} = require('./server/security/api-token-store');

const {
  ConfigPreflightService
} = require('./server/system/config-preflight-service');

(async () => {
  const paths =
    createRuntimePaths();

  const config =
    loadRuntimeConfig({
      paths
    });

  const service =
    new ConfigPreflightService({
      config,
      paths,
      apiTokenStore:
        ApiTokenStore.fromConfig(
          config.apiV2
        )
    });

  const result =
    await service.run();

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  process.exitCode =
    result.ready
      ? 0
      : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
NODE
