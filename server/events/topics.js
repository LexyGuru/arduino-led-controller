'use strict';

const EVENT_TOPICS = Object.freeze({
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  LED_UPDATED: 'led.updated',
  LED_ALL_CHANGED: 'led.all-changed',
  LED_RESET: 'led.reset',
  SCHEDULE_RELOADED: 'schedule.reloaded',
  SCHEDULE_GENERATED: 'schedule.generated',
  SCHEDULE_CLEARED: 'schedule.cleared',
  SCHEDULE_TESTED: 'schedule.tested',
  SCHEDULE_SYNCED: 'schedule.synced',
  LOCAL_SCHEDULE_CREATED: 'local-schedule.created',
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
