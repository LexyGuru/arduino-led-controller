'use strict';

const path = require('path');

const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '../..');

function resolveFromRoot(projectRoot, value, fallback) {
  const selected = String(value || fallback || '').trim();

  if (!selected) {
    throw new Error('A futásidejű útvonal nem lehet üres.');
  }

  return path.isAbsolute(selected)
    ? path.normalize(selected)
    : path.resolve(projectRoot, selected);
}

function createRuntimePaths(
  environment = process.env,
  projectRoot = DEFAULT_PROJECT_ROOT
) {
  const root = path.resolve(projectRoot);

  const dataDir = resolveFromRoot(
    root,
    environment.DATA_DIR,
    'data'
  );

  const configDir = resolveFromRoot(
    root,
    environment.CONFIG_DIR,
    'config'
  );

  const schedulesDir = resolveFromRoot(
    root,
    environment.SCHEDULES_DIR,
    'schedules'
  );

  const firmwareDir = resolveFromRoot(
    root,
    environment.FIRMWARE_DIR,
    path.join(dataDir, 'firmware')
  );

  return Object.freeze({
    projectRoot: root,
    dataDir,
    configDir,
    schedulesDir,
    firmwareDir,
    publicDir: resolveFromRoot(
      root,
      environment.PUBLIC_DIR,
      'public'
    ),
    authFile: resolveFromRoot(
      root,
      environment.AUTH_FILE,
      path.join(configDir, 'users.json')
    ),
    auditFile: resolveFromRoot(
      root,
      environment.AUDIT_FILE,
      path.join(dataDir, 'audit-log.jsonl')
    ),
    otaToolPath: resolveFromRoot(
      root,
      environment.OTA_TOOL_PATH,
      path.join('tools', 'arduinoOTA', 'arduinoOTA')
    ),
    packageFile: path.join(root, 'package.json'),
    versionFile: path.join(root, 'version.json'),
    runtimeSettingsFile: path.join(
      configDir,
      'server-settings.json'
    )
  });
}

module.exports = {
  DEFAULT_PROJECT_ROOT,
  createRuntimePaths,
  resolveFromRoot
};
