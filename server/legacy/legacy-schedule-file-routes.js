'use strict';

const multer = require('multer');

const {
  getRuntimeContext
} = require('../core/runtime-context');
const {
  sendLegacyError
} = require('./legacy-response');

function installLegacyScheduleFileRoutes(app) {
  const runtime = getRuntimeContext();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: runtime.config.files.maximumScheduleBytes, files: 1 }
  });

  app.get('/api/files', async (req, res) => {
    try {
      return res.json({
        files: await runtime.scheduleFileService.list({ includeAll: true })
      });
    } catch (error) {
      return sendLegacyError(res, error, {
        fallbackMessage: 'A fájllista betöltése nem sikerült.',
        fallbackCode: 'FILE_LIST_ERROR',
        fallbackStatus: 500
      });
    }
  });

  app.post('/api/upload/schedule', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nincs fájl feltöltve', code: 'NO_FILE' });
    }

    try {
      const result = await runtime.scheduleFileService.store(
        req.file.originalname,
        req.file.buffer,
        { uploadArduino: req.body?.uploadArduino !== '0' }
      );
      return res.json({
        success: true,
        message: result.arduinoUploaded
          ? 'Ütemezés elmentve és feltöltve az Arduino vezérlőre.'
          : 'Ütemezés biztonságosan elmentve a szerveren.',
        filename: result.filename,
        result
      });
    } catch (error) {
      return sendLegacyError(res, error, {
        fallbackMessage: 'A schedule fájl mentése nem sikerült.',
        fallbackCode: 'UPLOAD_ERROR',
        fallbackStatus: error.statusCode || 500
      });
    }
  });
}

module.exports = {
  installLegacyScheduleFileRoutes
};
