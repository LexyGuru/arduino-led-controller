'use strict';

const EVENT_TOPICS = Object.freeze({
  SYSTEM_READY: 'system.ready',
  SYSTEM_DRAINING: 'system.draining',
  ARDUINO_STATUS: 'arduino.status',
  ARDUINO_OFFLINE: 'arduino.offline',
  ARDUINO_RESTARTING: 'arduino.restarting',
  ARDUINO_CONSOLE_CLEARED: 'arduino.console-cleared',
  SETTINGS_ARDUINO_UPDATED: 'settings.arduino-updated',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_REMOVED: 'user.removed',
  USER_PASSWORD_CHANGED: 'user.password-changed',
  SECURITY_AUDIT: 'security.audit',
  LED_UPDATED: 'led.updated',
  LED_ALL_CHANGED: 'led.all-changed',
  LED_RESET: 'led.reset',
  LED_DEBUG: 'led.debug',
  SCHEDULE_RELOADED: 'schedule.reloaded',
  SCHEDULE_GENERATED: 'schedule.generated',
  SCHEDULE_CLEARED: 'schedule.cleared',
  SCHEDULE_TESTED: 'schedule.tested',
  SCHEDULE_SYNCED: 'schedule.synced',
  SCHEDULE_FILE_STORED: 'schedule-file.stored',
  LOCAL_SCHEDULE_CREATED: 'local-schedule.created',
  LOCAL_SCHEDULE_UPDATED: 'local-schedule.updated',
  LOCAL_SCHEDULE_REMOVED: 'local-schedule.removed',
  LOCAL_SCHEDULE_IMPORTED: 'local-schedule.imported',
  LOCAL_SCHEDULE_RUN: 'local-schedule.run',
  FIRMWARE_STATE: 'firmware.state',
  SOCKET_CONNECTED: 'socket.connected',
  SOCKET_DISCONNECTED: 'socket.disconnected'
});

module.exports = {
  EVENT_TOPICS
};
