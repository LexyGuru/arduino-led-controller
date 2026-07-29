'use strict';

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  sendLegacyError
} = require(
  './legacy-response'
);

function installLegacyLocalScheduleRoutes(
  app
) {
  app.get(
    '/api/local-schedules',
    async (req, res) => {
      const schedules =
        await getRuntimeContext()
          .localScheduleService
          .list();

      return res.json({
        schedules
      });
    }
  );

  app.get(
    '/api/local-schedules/export',
    async (req, res) => {
      const document =
        await getRuntimeContext()
          .localScheduleService
          .export();

      res.set({
        'Content-Type':
          'application/json; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="weekly-led-schedules.json"'
      });

      return res.json(
        document
      );
    }
  );

  app.post(
    '/api/local-schedules',
    async (req, res) => {
      try {
        const schedules =
          await getRuntimeContext()
            .localScheduleService
            .create(
              req.body
            );

        return res
          .status(201)
          .json({
            schedules
          });
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackMessage:
              'Az időzítés mentése nem sikerült.',
            fallbackCode:
              'LOCAL_SCHEDULE_ERROR',
            fallbackStatus:
              400
          }
        );
      }
    }
  );

  app.post(
    '/api/local-schedules/import',
    async (req, res) => {
      try {
        const result =
          await getRuntimeContext()
            .localScheduleService
            .import(
              req.body
            );

        return res.json({
          success: true,
          count:
            result.count,
          backupFile:
            result.backupFile
        });
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackMessage:
              'Az időzítések mentése nem sikerült.',
            fallbackCode:
              'LOCAL_SCHEDULE_IMPORT_ERROR',
            fallbackStatus:
              400
          }
        );
      }
    }
  );

  app.delete(
    '/api/local-schedules/:id',
    async (req, res) => {
      try {
        await getRuntimeContext()
          .localScheduleService
          .remove(
            req.params.id
          );

        return res.json({
          success: true
        });
      } catch (error) {
        return sendLegacyError(
          res,
          error,
          {
            fallbackMessage:
              'Az ütemezés nem található.',
            fallbackCode:
              'LOCAL_SCHEDULE_NOT_FOUND',
            fallbackStatus:
              404
          }
        );
      }
    }
  );

  app.post(
    '/api/local-schedules/sync-arduino',
    async (req, res) => {
      try {
        const runtime =
          getRuntimeContext();

        const schedules =
          await runtime
            .localScheduleService
            .list();

        const result =
          await runtime
            .localScheduleService
            .syncArduino();

        return res.json({
          success: true,
          count:
            schedules.length,
          result:
            result.arduino ??
            result
        });
      } catch (error) {
        return res
          .status(503)
          .json({
            error:
              `Az Arduino EEPROM-időzítőjének mentése nem sikerült: ${error.message}`
          });
      }
    }
  );
}

module.exports = {
  installLegacyLocalScheduleRoutes
};
