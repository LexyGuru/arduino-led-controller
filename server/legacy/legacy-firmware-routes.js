'use strict';

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  FirmwareServiceError
} = require(
  '../firmware/firmware-error'
);

function installLegacyFirmwareRoutes(
  app
) {
  app.get(
    '/api/firmware/status',
    async (req, res) => {
      try {
        return res.json(
          await getRuntimeContext()
            .firmwareService
            .getStatus()
        );
      } catch (error) {
        return res
          .status(500)
          .json({
            error:
              error.message ||
              'A firmware állapota nem kérhető le.'
          });
      }
    }
  );

  app.post(
    '/api/firmware/update',
    async (req, res) => {
      try {
        const result =
          getRuntimeContext()
            .firmwareService
            .startUpdate();

        return res
          .status(202)
          .json({
            success: true,
            message:
              result.message ||
              'A firmware-frissítés elindult.'
          });
      } catch (error) {
        if (
          error instanceof
          FirmwareServiceError
        ) {
          const payload = {
            error:
              error.message
          };

          if (
            error.details?.state
          ) {
            payload.state =
              error.details.state;
          }

          return res
            .status(
              error.statusCode
            )
            .json(payload);
        }

        return res
          .status(500)
          .json({
            error:
              error.message ||
              'A firmware-frissítés nem indítható el.'
          });
      }
    }
  );
}

module.exports = {
  installLegacyFirmwareRoutes
};
