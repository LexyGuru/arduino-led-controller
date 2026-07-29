'use strict';

const fs = require('fs');
const express = require('express');

const {
  getRuntimeContext
} = require('../core/runtime-context');

function installStaticWebAssets(app) {
  const runtime = getRuntimeContext();
  if (runtime.config.web.staticAssetsEnabled !== true) return;
  if (!fs.existsSync(runtime.paths.publicDir)) return;

  app.use(
    express.static(
      runtime.paths.publicDir,
      {
        fallthrough: true,
        index: false,
        maxAge: runtime.config.web.staticCacheSeconds * 1000,
        immutable: false,
        etag: true
      }
    )
  );
}

function staticWebStatus(runtime) {
  return {
    enabled: runtime.config.web.staticAssetsEnabled,
    directory: runtime.paths.publicDir,
    directoryExists: fs.existsSync(runtime.paths.publicDir),
    cacheSeconds: runtime.config.web.staticCacheSeconds,
    legacyInlineDashboardEnabled: true
  };
}

module.exports = {
  installStaticWebAssets,
  staticWebStatus
};
