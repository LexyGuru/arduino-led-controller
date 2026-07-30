'use strict';

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  RuntimeSettingsError
} = require(
  '../core/runtime-settings-service'
);

function installLegacySettingsRoutes(
  app
) {
  app.get(
    '/api/settings',
    (req, res) => {
      const runtime =
        getRuntimeContext();

      return res.json(
        runtime
          .runtimeSettingsService
          .getArduinoTarget()
      );
    }
  );

  app.put(
    '/api/settings/arduino',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        const result =
          await runtime
            .runtimeSettingsService
            .updateArduinoTarget(
              req.body,
              {
                principal:
                  req.user
                    ? {
                        subject:
                          req.user
                            .username,
                        role:
                          req.user
                            .role,
                        type:
                          'user-session'
                      }
                    : null
              }
            );

        return res.json(
          result
        );
      } catch (error) {
        if (
          error instanceof
          RuntimeSettingsError
        ) {
          return res
            .status(400)
            .json({
              error:
                error.message
            });
        }

        return res
          .status(500)
          .json({
            error:
              'A beállítás mentése nem sikerült.'
          });
      }
    }
  );
}

module.exports = {
  installLegacySettingsRoutes
};
