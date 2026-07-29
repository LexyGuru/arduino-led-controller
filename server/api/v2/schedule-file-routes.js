'use strict';

const multer = require('multer');

const {
  FileServiceError
} = require('../../files/file-service-error');
const {
  PERMISSIONS
} = require('../../security/roles');
const {
  getRuntimeContext
} = require('../../core/runtime-context');
const {
  createPermissionMiddleware
} = require('./authorize');
const {
  requireApiV2Auth
} = require('./auth');
const {
  HttpError
} = require('./http-error');
const {
  sendSuccess
} = require('./http-response');
const {
  asyncRoute
} = require('./routes');

function mapFileServiceError(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof FileServiceError || Number.isInteger(error?.statusCode)) {
    return new HttpError(
      error.statusCode || 500,
      error.code || 'FILE_SERVICE_ERROR',
      error.message,
      error.details,
      { cause: error }
    );
  }
  return HttpError.internal(
    'FILE_SERVICE_ERROR',
    'A fájlszolgáltatás hibát jelzett.',
    null,
    { cause: error }
  );
}

function installScheduleFileRoutes(app) {
  const runtime = getRuntimeContext();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: runtime.config.files.maximumScheduleBytes, files: 1 }
  });
  const read = createPermissionMiddleware(PERMISSIONS.FILE_READ);
  const write = createPermissionMiddleware(PERMISSIONS.FILE_WRITE);

  app.get(
    '/api/v2/files/schedules',
    requireApiV2Auth,
    read,
    asyncRoute(async (req, res) => sendSuccess(
      req,
      res,
      {
        status: runtime.scheduleFileService.status(),
        files: await runtime.scheduleFileService.list()
      }
    ))
  );

  app.get(
    '/api/v2/files/schedules/:filename',
    requireApiV2Auth,
    read,
    asyncRoute(async (req, res) => {
      try {
        return sendSuccess(req, res, await runtime.scheduleFileService.read(req.params.filename));
      } catch (error) {
        throw mapFileServiceError(error);
      }
    })
  );

  app.post(
    '/api/v2/files/schedules',
    requireApiV2Auth,
    write,
    upload.single('file'),
    asyncRoute(async (req, res) => {
      if (!req.file) {
        throw HttpError.badRequest('NO_FILE', 'Nincs fájl feltöltve.');
      }
      try {
        return sendSuccess(
          req,
          res,
          await runtime.scheduleFileService.store(
            req.file.originalname,
            req.file.buffer,
            { uploadArduino: req.body?.uploadArduino !== '0' }
          ),
          { statusCode: 201 }
        );
      } catch (error) {
        throw mapFileServiceError(error);
      }
    })
  );
}

module.exports = {
  installScheduleFileRoutes,
  mapFileServiceError
};
