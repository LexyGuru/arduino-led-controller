'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const MAX_LOG_FILES = 14;
const MAX_LOG_BYTES = 10 * 1024 * 1024;

function redactString(value) {
  const text = String(value); const lower = text.toLowerCase();
  const sensitive = ['x-device-key','authorization:','bearer ','ota-password','ota_password','password=','"password"','"token"','"secret"','arduino_api_key','apikey'];
  return sensitive.some((needle) => lower.includes(needle)) ? '[REDACTED_SENSITIVE_LOG_MESSAGE]' : text;
}
function redactValue(value, key = '') {
  const lower = String(key).toLowerCase();
  if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('devicekey') || lower.includes('api_key') || lower === 'authorization') return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactValue(childValue, childKey)]));
  return typeof value === 'string' ? redactString(value) : value;
}
function safeDate() { return new Date().toISOString().slice(0, 10); }
function pruneLogs(directory, prefix) {
  if (!fs.existsSync(directory)) return;
  const files = fs.readdirSync(directory).filter((name) => name.startsWith(prefix) && name.endsWith('.log')).sort().reverse();
  for (const stale of files.slice(MAX_LOG_FILES)) { try { fs.unlinkSync(path.join(directory, stale)); } catch {} }
}
function createLogger(options = {}) {
  const serviceName = String(options.serviceName || 'arduino-led-controller').trim() || 'arduino-led-controller';
  const level = String(options.level || 'info').trim() || 'info';
  const redactionFormat = winston.format((info) => { const cleaned = redactValue({ ...info }); Object.keys(info).forEach((key) => delete info[key]); Object.assign(info, cleaned); return info; });
  const logger = winston.createLogger({
    level, silent: options.silent === true,
    defaultMeta: { service: serviceName, platform: 'lxc-node', processId: process.pid },
    format: winston.format.combine(redactionFormat(), winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console({ format: winston.format.combine(redactionFormat(), winston.format.timestamp(), winston.format.simple()) })]
  });
  if (options.enableFileLogging === true && typeof options.dataDir === 'string') {
    const logRoot = path.join(options.dataDir, 'logs'); const appDir = path.join(logRoot, 'app'); const errorDir = path.join(logRoot, 'errors');
    fs.mkdirSync(appDir, { recursive: true }); fs.mkdirSync(errorDir, { recursive: true });
    const day = safeDate(); pruneLogs(appDir, 'app-'); pruneLogs(errorDir, 'errors-');
    logger.add(new winston.transports.File({ filename: path.join(appDir, `app-${day}.log`), maxsize: MAX_LOG_BYTES, maxFiles: MAX_LOG_FILES }));
    logger.add(new winston.transports.File({ filename: path.join(errorDir, `errors-${day}.log`), level: 'error', maxsize: MAX_LOG_BYTES, maxFiles: MAX_LOG_FILES }));
    logger.logRoot = logRoot;
  }
  if (!globalThis.__ALC_GLOBAL_LOG_HANDLERS__) {
    globalThis.__ALC_GLOBAL_LOG_HANDLERS__ = true;
    process.on('uncaughtExceptionMonitor', (error, origin) => logger.error('UNCAUGHT_EXCEPTION', { category: 'errors', event: 'UNCAUGHT_EXCEPTION', origin, error: error && error.stack ? error.stack : String(error) }));
    process.on('unhandledRejection', (reason) => logger.error('UNHANDLED_REJECTION', { category: 'errors', event: 'UNHANDLED_REJECTION', error: reason && reason.stack ? reason.stack : String(reason) }));
  }
  logger.info('LOGGER_READY', { category: 'app', event: 'LOGGER_READY', fileLogging: options.enableFileLogging === true, logRoot: logger.logRoot || null });
  return logger;
}
function closeLogger(logger) {
  if (!logger) return;
  for (const transport of logger.transports || []) if (typeof transport.close === 'function') transport.close();
  if (typeof logger.close === 'function') logger.close();
}
module.exports = { closeLogger, createLogger, redactString, redactValue };
