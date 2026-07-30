'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');

function createLogger(options = {}) {
  const serviceName =
    String(
      options.serviceName ||
      'arduino-led-controller'
    ).trim() || 'arduino-led-controller';

  const level =
    String(options.level || 'info').trim() || 'info';

  const logger = winston.createLogger({
    level,
    silent: options.silent === true,
    defaultMeta: {
      service: serviceName
    },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });

  if (
    options.enableFileLogging === true &&
    typeof options.dataDir === 'string' &&
    fs.existsSync(options.dataDir)
  ) {
    logger.add(
      new winston.transports.File({
        filename: path.join(
          options.dataDir,
          'error.log'
        ),
        level: 'error'
      })
    );

    logger.add(
      new winston.transports.File({
        filename: path.join(
          options.dataDir,
          'combined.log'
        )
      })
    );
  }

  return logger;
}

function closeLogger(logger) {
  if (!logger) return;

  for (const transport of logger.transports || []) {
    if (typeof transport.close === 'function') {
      transport.close();
    }
  }

  if (typeof logger.close === 'function') {
    logger.close();
  }
}

module.exports = {
  closeLogger,
  createLogger
};
