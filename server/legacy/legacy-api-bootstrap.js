'use strict';

const express =
  require('express');

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  createLegacyApiUserMiddleware
} = require(
  './legacy-auth-middleware'
);

const {
  installLegacyAuthRoutes
} = require(
  './legacy-auth-routes'
);

const {
  installLegacySettingsRoutes
} = require(
  './legacy-settings-routes'
);

const {
  installLegacyArduinoRoutes
} = require(
  './legacy-arduino-routes'
);

const {
  installLegacyFirmwareRoutes
} = require(
  './legacy-firmware-routes'
);

const {
  installLegacyLocalScheduleRoutes
} = require(
  './legacy-local-schedule-routes'
);

function installLegacyApiAdapters(
  app
) {
  const runtime =
    getRuntimeContext();

  if (
    runtime.config
      .legacy
      .apiAdaptersEnabled !==
    true
  ) {
    return;
  }

  app.use(
    '/api',
    express.json({
      limit:
        '2mb'
    }),
    express.urlencoded({
      extended:
        false,
      limit:
        '2mb'
    })
  );

  installLegacyAuthRoutes(
    app
  );

  app.use(
    '/api',
    (req, res, next) => {
      res.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.set(
        'Pragma',
        'no-cache'
      );
      res.set(
        'Expires',
        '0'
      );
      return next();
    },
    createLegacyApiUserMiddleware({
      sessionService:
        runtime.sessionService
    })
  );

  installLegacySettingsRoutes(
    app
  );
  installLegacyArduinoRoutes(
    app
  );
  installLegacyFirmwareRoutes(
    app
  );

  if (
    runtime.config
      .legacy
      .localScheduleAdaptersEnabled ===
    true
  ) {
    installLegacyLocalScheduleRoutes(
      app
    );
  }
}

module.exports = {
  installLegacyApiAdapters
};
