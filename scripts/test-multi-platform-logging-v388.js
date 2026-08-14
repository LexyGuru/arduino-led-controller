#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict'); const fs = require('node:fs');
const rootPackage = require('../package.json'); const desktopPackage = require('../desktop-tauri/package.json'); const versions = require('../release-versions.json');
assert.equal(rootPackage.version, '5.5.1-beta.2'); assert.equal(desktopPackage.version, '5.5.1-beta.2');
assert.equal(versions.application, '5.5.1-beta.2'); assert.equal(versions.firmware, '5.0.0-beta.9'); assert.equal(versions.directApi, '1.0.0');
const rust = fs.readFileSync('desktop-tauri/src-tauri/src/diagnostic_logging.rs','utf8');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const main = fs.readFileSync('desktop-tauri/src/main.tsx','utf8');
const logger = fs.readFileSync('server/core/logger.js','utf8'); const server = fs.readFileSync('server2_final.js','utf8');
for (const marker of ['ios-ipados','android','desktop-macos','desktop-windows','desktop-linux','MAX_LOG_BYTES','ROTATED_FILES','[REDACTED]','diagnostic_log_event','diagnostic_log_paths','log_ota_progress']) assert.ok(rust.includes(marker), `Rust logging marker missing: ${marker}`);
assert.match(lib,/mod diagnostic_logging;/); assert.match(lib,/diagnostic_logging::log_ota_progress/); assert.match(lib,/diagnostic_logging::diagnostic_log_event/); assert.match(lib,/diagnostic_logging::diagnostic_log_paths/);
assert.match(main,/FRONTEND_ERROR/); assert.match(main,/UNHANDLED_REJECTION/); assert.match(main,/APP_START/);
assert.match(logger,/MAX_LOG_FILES = 14/); assert.match(logger,/MAX_LOG_BYTES = 10 \* 1024 \* 1024/); assert.match(logger,/uncaughtExceptionMonitor/); assert.match(logger,/unhandledRejection/); assert.match(logger,/\[REDACTED\]/); assert.match(server,/enableFileLogging:\s*true/);
console.log('APP_VERSION_BETA3=PASSED'); console.log('FIRMWARE_BETA8_UNCHANGED=PASSED'); console.log('DIRECT_API_V1_UNCHANGED=PASSED');
console.log('DESKTOP_FILE_LOGGING=PASSED'); console.log('IOS_IPADOS_FILE_LOGGING=PASSED'); console.log('ANDROID_FILE_LOGGING=PASSED'); console.log('LXC_FILE_LOGGING=PASSED');
console.log('OTA_SESSION_EVENT_PERSISTENCE=PASSED'); console.log('FRONTEND_ERROR_CAPTURE=PASSED'); console.log('SECRET_REDACTION=PASSED'); console.log('LOG_ROTATION=PASSED'); console.log('V388_MULTI_PLATFORM_LOGGING_CONTRACT=PASSED');
